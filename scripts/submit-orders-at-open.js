'use strict';

/**
 * Submit approved portfolio trades after market open with live pricing.
 * Reads executable trade rows from portfolio/<name>/trades.md instead of a hard-coded list.
 */

const { execSync } = require('child_process');
const path = require('path');
const { validateTradeList } = require('../lib/etfQualityFilter');
const { isMarketOpen, nextOpenTime } = require('../lib/marketHours');
const { listExecutableTradeRows, updateTradeRows } = require('../src/execution/tradeState');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { evaluateExecutionPolicy } = require('../src/execution/portfolioExecution');

const IBKR_CLI = path.join(__dirname, '..', 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const portfolioDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'portfolio', 'etf'));
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

  const executable = buildExecutableOrders();
  if (executable.length === 0) {
    console.error('✗ No approved executable trade rows found for market-open submission.');
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
      console.error(`  ✗ No quote available for ${trade.symbol} — skipping`);
      continue;
    }
    const limit = calculateSmartLimit(quote, trade.action);
    if (!limit) {
      console.error(`  ✗ Cannot determine limit price for ${trade.symbol} — skipping`);
      continue;
    }
    console.log(`  → Smart limit: ${limit} ${trade.currency}`);
    orders.push({ ...trade, limit, quote });
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

main().catch(err => {
  console.error('FATAL:', err.stack || String(err));
  process.exit(1);
});
