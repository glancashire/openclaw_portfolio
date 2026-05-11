'use strict';

/**
 * Submit approved portfolio trades after market open with live pricing.
 * Reads executable trade rows from portfolio/<name>/trades.md instead of a hard-coded list.
 */

const fs = require('fs');
const path = require('path');
const { validateTradeList } = require('../lib/etfQualityFilter');
const { isMarketOpen, nextOpenTime } = require('../lib/marketHours');
const { listExecutableTradeRows, updateTradeRows } = require('../src/execution/tradeState');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { fetchLatestPrice } = require('../src/brokers/interactive-brokers/pricing');
const { calculateSmartLimit, analyzeQuoteTrend, shouldBlockForTrend, evaluateMarketOpenBlock } = require('../src/execution/marketOpenPolicy');
const { recordRuntimeEvent } = require('../src/observability/runtimeEvents');

const cliArgs = process.argv.slice(2);
const DRY_RUN = cliArgs.includes('--dry-run');
const FORCE = cliArgs.includes('--force');
const HELP = cliArgs.includes('--help') || cliArgs.includes('-h');
const positionalArgs = cliArgs.filter((arg) => !arg.startsWith('-'));
const portfolioDir = path.resolve(positionalArgs[0] || path.join(__dirname, '..', 'portfolio', 'etf'));
const tradesPath = path.join(portfolioDir, 'trades.md');
const portfolioPath = path.join(portfolioDir, 'portfolio.md');

async function getLiveQuote(trade) {
  if (!trade?.conid) return { ok: false, reason: 'missing_conid', error: 'No IBKR conid is configured for this trade.' };
  const quote = await fetchLatestPrice({ conid: trade.conid, portfolio: path.basename(portfolioDir) });
  if (!quote?.ok) {
    console.error(`[smart-exec] Quote failed for ${trade.symbol}: ${quote?.error || quote?.reason || 'unknown error'}`);
  }
  return quote;
}

function classifyQuoteFailure(quote) {
  const message = String(quote?.error || quote?.reason || '').trim();
  if (/Requested market data is not subscribed\. Displaying delayed market data\./i.test(message)) {
    return {
      blockCode: 'market_data_entitlement_required',
      blockReason: 'Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.',
      nextAction: 'Enable the required IBKR market-data entitlement for this venue/instrument, or rerun when a safe delayed-price policy exists.',
    };
  }
  if (quote?.reason === 'missing_conid') {
    return {
      blockCode: 'instrument_mapping_incomplete',
      blockReason: 'No IBKR contract identifier is configured for this approved trade row.',
      nextAction: 'Add the correct IBKR conid metadata before retrying market-open submission.',
    };
  }
  return {
    blockCode: 'quote_unavailable',
    blockReason: 'No broker quote was available during market-open execution.',
    nextAction: 'Restore broker pricing and rerun the market-open submission path.',
  };
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

function clearTradeBlock(trade, { nextAction = 'Ready for market-open submission.' } = {}) {
  updateTradeRows(tradesPath, { dateTime: trade.row.dateTime, tickerOrIsin: trade.row.tickerOrIsin, action: trade.row.action }, (row) => ({
    ...row,
    Status: 'approved',
    Approval: 'queued_for_open_runner',
    'Block code': '',
    'Block reason': '',
    'Blocked at': '',
    'Next action': nextAction,
  }));
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
    const quote = await getLiveQuote(trade);
    if (!quote?.ok) {
      const classified = classifyQuoteFailure(quote);
      console.error(`  ✗ ${classified.blockReason}`);
      markTradeBlocked(trade, classified);
      continue;
    }
    const policy = evaluateMarketOpenBlock({ trade, quote, marketEntryPolicy });
    const trendInfo = policy.trendInfo;
    if (trendInfo.ok) {
      console.log(`  → Trend check: ${trendInfo.trend} (${trendInfo.movePct}% vs prior close ${trendInfo.closePrice})`);
    } else {
      console.log('  → Trend check: unavailable (missing usable close/reference price)');
    }
    if (policy.blocked) {
      console.error(`  ✗ ${policy.blockReason}`);
      markTradeBlocked(trade, {
        blockCode: policy.blockCode,
        blockReason: policy.blockReason,
        nextAction: policy.nextAction,
      });
      continue;
    }
    clearTradeBlock(trade);
    console.log(`  → Smart limit: ${policy.limitPrice} ${trade.currency}`);
    orders.push({ ...trade, limit: policy.limitPrice, quote, trendInfo });
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
      const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');
      const client = new InteractiveBrokersClient({ portfolio: path.basename(portfolioDir) });
      const result = await client.placeOrder({
        symbol: order.symbol,
        conid: order.conid,
        action: order.action,
        quantity: order.qty,
        orderType: 'LMT',
        limitPrice: order.limit,
        currency: order.currency,
        exchange: order.exchange,
        secType: 'STK',
        transmit: true,
      }, { dryRun: false, revocableOnly: true, transmitLive: true });
      if (!result.ok) throw new Error(result.error || result.message || result.reason || 'Broker placeOrder failed');
      const orderId = result.order?.orderId ? String(result.order.orderId) : '';
      updateTradeRows(tradesPath, { dateTime: order.row.dateTime, tickerOrIsin: order.row.tickerOrIsin, action: order.row.action }, (row) => ({
        ...row,
        Status: 'submitted',
        Approval: 'submitted_to_broker',
        'Broker order id': orderId,
        'Limit price': String(order.limit),
        Reason: `${row.Reason}; Market-open live submission attempted.`,
      }));
      console.log(`  → orderId=${result.order?.orderId} status=${result.order?.status}`);
      results.push({ ...order, orderId: result.order?.orderId, status: result.order?.status, errors: result.brokerErrors });
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
