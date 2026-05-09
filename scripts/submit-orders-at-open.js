'use strict';

/**
 * Submit approved portfolio trades after market open with live pricing.
 * Reads executable trade rows from portfolio/<name>/trades.md instead of a hard-coded list.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { validateTradeList } = require('../lib/etfQualityFilter');
const { isMarketOpen, nextOpenTime } = require('../lib/marketHours');
const { listExecutableTradeRows, updateTradeRows } = require('../src/execution/tradeState');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { recordRuntimeEvent } = require('../src/observability/runtimeEvents');

const IBKR_CLI = path.join(__dirname, '..', 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
const cliArgs = process.argv.slice(2);
const DRY_RUN = cliArgs.includes('--dry-run');
const FORCE = cliArgs.includes('--force');
const HELP = cliArgs.includes('--help') || cliArgs.includes('-h');
const positionalArgs = cliArgs.filter((arg) => !arg.startsWith('-'));
const portfolioDir = path.resolve(positionalArgs[0] || path.join(__dirname, '..', 'portfolio', 'etf'));
const tradesPath = path.join(portfolioDir, 'trades.md');
const portfolioPath = path.join(portfolioDir, 'portfolio.md');

function ibkr(args) {
  return execSync(`python3 ${IBKR_CLI} ${args}`, { encoding: 'utf8', timeout: 30000 }).trim();
}

function getLiveQuote(symbol, exchange, currency, primaryExchange) {
  const script = `
from ib_insync import *
ib = IB()
ib.connect('127.0.0.1', 4001, clientId=110, timeout=10)
ib.reqMarketDataType(1)
contract = Stock('${symbol}', '${exchange}', '${currency}'${primaryExchange ? `, primaryExchange='${primaryExchange}'` : ''})
ib.qualifyContracts(contract)
ticker = ib.reqMktData(contract)
ib.sleep(8)
import json
print(json.dumps({"bid": ticker.bid if ticker.bid == ticker.bid else None, "ask": ticker.ask if ticker.ask == ticker.ask else None, "last": ticker.last if ticker.last == ticker.last else None, "close": ticker.close if ticker.close == ticker.close else None}))
ib.disconnect()
`;
  try {
    const out = execSync(`python3 -c '${script.replace(/'/g, "'\\''")}'`, { encoding: 'utf8', timeout: 20000 });
    return JSON.parse(out.trim());
  } catch (e) {
    console.error(`[smart-exec] Quote failed for ${symbol}: ${e.message}`);
    return null;
  }
}

function calculateSmartLimit(quote, action) {
  if (quote.bid && quote.ask && quote.bid > 0 && quote.ask > 0) {
    if (action === 'BUY') return Math.round(quote.ask * 10000) / 10000;
    return Math.round(quote.bid * 10000) / 10000;
  }
  const ref = quote.last || quote.close;
  if (!ref) return null;
  const buffer = action === 'BUY' ? 1.003 : 0.997;
  return Math.round(ref * buffer * 10000) / 10000;
}

function parseBooleanLine(text, label) {
  const match = text.match(new RegExp(`- ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.+)`));
  if (!match) return null;
  const value = String(match[1] || '').trim();
  if (/^(true|yes)$/i.test(value)) return true;
  if (/^(false|no)$/i.test(value)) return false;
  return null;
}

function loadMarketEntryPolicy() {
  const text = fs.readFileSync(portfolioPath, 'utf8');
  return {
    avoidBuyingAfterExtremeDailyMoves: parseBooleanLine(text, 'Avoid buying after extreme daily price moves') !== false,
  };
}

function analyzeQuoteTrend(quote) {
  const close = Number(quote?.close);
  const last = Number(quote?.last);
  const bid = Number(quote?.bid);
  const ask = Number(quote?.ask);
  const reference = Number.isFinite(last) && last > 0
    ? last
    : Number.isFinite(ask) && ask > 0
      ? ask
      : Number.isFinite(bid) && bid > 0
        ? bid
        : null;
  if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(reference) || reference <= 0) {
    return { ok: false, trend: 'unknown', movePct: null, referencePrice: reference, closePrice: Number.isFinite(close) ? close : null };
  }
  const movePct = Number((((reference - close) / close) * 100).toFixed(2));
  return {
    ok: true,
    trend: movePct >= 1 ? 'up' : movePct <= -1 ? 'down' : 'flat',
    movePct,
    referencePrice: reference,
    closePrice: close,
  };
}

function shouldBlockForTrend({ action, trendInfo, marketEntryPolicy, extremeMovePct = 3 }) {
  if (String(action || '').toUpperCase() !== 'BUY') return { block: false, reason: null };
  if (!marketEntryPolicy?.avoidBuyingAfterExtremeDailyMoves) return { block: false, reason: null };
  if (!trendInfo?.ok) return { block: false, reason: null };
  if (Number(trendInfo.movePct) >= extremeMovePct) {
    return {
      block: true,
      reason: `Buy skipped because price is up ${trendInfo.movePct}% versus prior close, breaching the extreme daily move guard (${extremeMovePct}%).`,
    };
  }
  return { block: false, reason: null };
}

function markTradeBlocked(trade, { blockCode, blockReason, nextAction, status = 'approved' }) {
  const blockedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  updateTradeRows(tradesPath, { dateTime: trade.row.dateTime, tickerOrIsin: trade.row.tickerOrIsin, action: trade.row.action }, (row) => ({
    ...row,
    Status: status,
    'Block code': blockCode,
    'Block reason': blockReason,
    'Blocked at': blockedAt,
    'Next action': nextAction,
    Reason: `${row.Reason}; ${blockReason}`,
  }));
  recordRuntimeEvent({
    level: 'warn',
    category: 'market_open_execution',
    action: 'submission_blocked',
    portfolio: path.basename(portfolioDir),
    mode: DRY_RUN ? 'dry_run' : 'live',
    status: 'blocked',
    summary: `${trade.symbol} blocked before submission: ${blockReason}`,
    details: {
      symbol: trade.symbol,
      tickerOrIsin: trade.row.tickerOrIsin,
      action: trade.action,
      quantity: trade.qty,
      blockCode,
      nextAction,
    },
  });
}

function buildExecutableOrders() {
  const rows = listExecutableTradeRows(tradesPath);
  const instruments = readApprovedInstruments(portfolioPath);
  return rows.map((row) => {
    const instrument = instruments.find((item) => String(item.tickerOrIsin || '').trim() === String(row.tickerOrIsin || '').trim() || String(item.ibkrSymbol || '').trim().toUpperCase() === String(row.tickerOrIsin || '').trim().toUpperCase());
    const symbol = instrument?.ibkrSymbol || row.tickerOrIsin;
    const conid = instrument?.ibkrConid || null;
    const exchange = 'SMART';
    const primaryExchange = instrument?.exchange?.includes('EBS') ? 'EBS' : undefined;
    const currency = instrument?.currency || 'CHF';
    return {
      row,
      symbol,
      conid,
      exchange,
      primaryExchange,
      currency,
      action: String(row.action || '').toUpperCase(),
      qty: Number(row.quantity || 0),
      name: row.name,
    };
  });
}

async function main() {
  if (HELP) {
    console.log('Usage: node scripts/submit-orders-at-open.js [portfolio-dir] [--dry-run] [--force]');
    return;
  }

  console.log(`=== Smart Market-Open Execution ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'} ===`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Portfolio: ${portfolioDir}`);
  console.log('');

  if (!DRY_RUN && !FORCE) {
    const market = isMarketOpen('EBS');
    if (!market.open) {
      console.error(`\n✗ Market is closed: ${market.reason}`);
      console.error(`  Next open: ${nextOpenTime('EBS')}`);
      console.error(`  Schedule this script to run at market open, or use --force to override.`);
      process.exit(1);
    }
    console.log('✓ Market is open');
  }

  const marketEntryPolicy = loadMarketEntryPolicy();
  const executable = buildExecutableOrders();
  if (executable.length === 0) {
    const message = 'No approved executable trade rows found for market-open submission.';
    if (DRY_RUN) {
      console.log(`✓ ${message}`);
      return;
    }
    console.error(`✗ ${message}`);
    process.exit(2);
  }

  const validation = validateTradeList(executable.map((t) => ({ symbol: t.symbol })));
  if (!validation.allPass) {
    console.error('ETF quality check FAILED:');
    for (const r of validation.results) {
      if (!r.pass) console.error(`  ${r.symbol}: ${r.reasons.join(', ')}`);
    }
    process.exit(1);
  }
  console.log('✓ All executable instruments pass ETF quality filter');
  console.log('');

  const orders = [];
  for (const trade of executable) {
    console.log(`Fetching live quote for ${trade.symbol}...`);
    const quote = getLiveQuote(trade.symbol, trade.exchange, trade.currency, trade.primaryExchange);
    if (!quote) {
      const reason = 'No broker quote was available during market-open execution.';
      console.error(`  ✗ No quote available for ${trade.symbol} — skipping`);
      markTradeBlocked(trade, {
        blockCode: 'quote_unavailable',
        blockReason: reason,
        nextAction: 'Restore broker pricing and rerun the market-open submission path.',
      });
      continue;
    }
    const trendInfo = analyzeQuoteTrend(quote);
    if (trendInfo.ok) {
      console.log(`  → Trend check: ${trendInfo.trend} (${trendInfo.movePct}% vs prior close ${trendInfo.closePrice})`);
    } else {
      console.log('  → Trend check: unavailable (missing usable close/reference price)');
    }
    const trendDecision = shouldBlockForTrend({ action: trade.action, trendInfo, marketEntryPolicy });
    if (trendDecision.block) {
      console.error(`  ✗ ${trendDecision.reason}`);
      markTradeBlocked(trade, {
        blockCode: 'trend_guard_blocked',
        blockReason: trendDecision.reason,
        nextAction: 'Review price action after the open and re-approve or reschedule if the move normalizes.',
      });
      continue;
    }
    const limit = calculateSmartLimit(quote, trade.action);
    if (!limit) {
      const reason = 'Could not determine a smart limit price from broker quote data.';
      console.error(`  ✗ Cannot determine limit price for ${trade.symbol} — skipping`);
      markTradeBlocked(trade, {
        blockCode: 'limit_price_unavailable',
        blockReason: reason,
        nextAction: 'Inspect broker quote fields and retry when a usable reference price is available.',
      });
      continue;
    }
    console.log(`  → Smart limit: ${limit} ${trade.currency}`);
    orders.push({ ...trade, limit, quote, trendInfo });
  }

  console.log('');
  console.log(`=== Placing ${orders.length} orders ===`);

  const results = [];
  for (const order of orders) {
    const args = [
      'place-order',
      `--symbol ${order.symbol}`,
      `--exchange ${order.exchange}`,
      order.primaryExchange ? `--primary-exchange ${order.primaryExchange}` : '',
      `--currency ${order.currency}`,
      `--action ${order.action}`,
      `--quantity ${order.qty}`,
      '--order-type LMT',
      `--limit-price ${order.limit}`,
      '--tif DAY',
      '--json',
    ].filter(Boolean);

    if (DRY_RUN) {
      console.log(`[DRY-RUN] ${order.action} ${order.qty} ${order.symbol} @ ${order.limit} ${order.currency}`);
      results.push({ ...order, orderId: 'DRY', status: 'dry-run' });
      continue;
    }

    console.log(`Placing: ${order.action} ${order.qty} ${order.symbol} @ ${order.limit} ${order.currency}`);
    try {
      const raw = ibkr(args.join(' '));
      const result = JSON.parse(raw);
      const orderId = result.trade?.orderId ? String(result.trade.orderId) : '';
      updateTradeRows(tradesPath, { dateTime: order.row.dateTime, tickerOrIsin: order.row.tickerOrIsin, action: order.row.action }, (row) => ({
        ...row,
        Status: 'submitted',
        Approval: 'submitted_to_broker',
        'Broker order id': orderId,
        'Limit price': String(order.limit),
        Reason: `${row.Reason}; Market-open live submission attempted.`,
      }));
      console.log(`  → orderId=${result.trade?.orderId} status=${result.trade?.status}`);
      results.push({ ...order, orderId: result.trade?.orderId, status: result.trade?.status, errors: result.errors });
    } catch (e) {
      console.error(`  ✗ Order failed: ${e.message}`);
      results.push({ ...order, orderId: null, status: 'error', error: e.message });
    }
  }

  console.log('');
  console.log('=== Summary ===');
  for (const r of results) {
    const icon = r.status === 'error' || r.status === 'Cancelled' ? '✗' : '✓';
    console.log(`  ${icon} ${r.action} ${r.qty} ${r.symbol} @ ${r.limit} ${r.currency} → ${r.status} (id: ${r.orderId})`);
  }

  if (!DRY_RUN && results.every((r) => r.status === 'error')) process.exit(3);
}

if (require.main === module) {
  main().catch(err => {
    console.error('FATAL:', err.stack || String(err));
    process.exit(1);
  });
}

module.exports = {
  calculateSmartLimit,
  analyzeQuoteTrend,
  shouldBlockForTrend,
  loadMarketEntryPolicy,
  buildExecutableOrders,
};
