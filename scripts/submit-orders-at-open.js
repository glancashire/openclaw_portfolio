'use strict';

/**
 * Submit orders after market open with real-time pricing.
 * Fetches live bid/ask, calculates smart limit prices, places orders.
 * Designed to run at ~09:01 CET via cron.
 */

const { execSync } = require('child_process');
const path = require('path');
const { validateTradeList } = require('../lib/etfQualityFilter');
const { notifyTradeFill } = require('../lib/tradeExecutionNotifier');

const IBKR_CLI = path.join(__dirname, '..', 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
const DRY_RUN = process.argv.includes('--dry-run');

// Trades to execute (approved by operator)
const TRADES = [
  { symbol: 'SLICHA', exchange: 'SMART', primaryExchange: 'EBS', currency: 'CHF', action: 'BUY', qty: 4, name: 'UBS ETF SLI', targetPct: 20.0 },
  { symbol: 'EMUAA', exchange: 'SMART', primaryExchange: 'EBS', currency: 'EUR', action: 'BUY', qty: 27, name: 'UBS MSCI EMU A Acc', targetPct: 20.0 },
  { symbol: 'VUSA', exchange: 'SMART', primaryExchange: 'EBS', currency: 'CHF', action: 'BUY', qty: 18, name: 'Vanguard S&P 500', targetPct: 40.0 },
];

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
  // If we have bid/ask, use midpoint + small buffer for BUY
  if (quote.bid && quote.ask && quote.bid > 0 && quote.ask > 0) {
    const mid = (quote.bid + quote.ask) / 2;
    const spread = quote.ask - quote.bid;
    if (action === 'BUY') {
      // Limit at ask (willing to pay the ask for immediate fill)
      return Math.round(quote.ask * 10000) / 10000;
    } else {
      return Math.round(quote.bid * 10000) / 10000;
    }
  }
  // Fallback: use last + 0.3% buffer
  const ref = quote.last || quote.close;
  if (!ref) return null;
  const buffer = action === 'BUY' ? 1.003 : 0.997;
  return Math.round(ref * buffer * 10000) / 10000;
}

async function main() {
  console.log(`=== Smart Market-Open Execution ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'} ===`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  // Step 1: Validate ETF quality
  const validation = validateTradeList(TRADES);
  if (!validation.allPass) {
    console.error('ETF quality check FAILED:');
    for (const r of validation.results) {
      if (!r.pass) console.error(`  ${r.symbol}: ${r.reasons.join(', ')}`);
    }
    process.exit(1);
  }
  console.log('✓ All instruments pass ETF quality filter (physical replication, TER within limits)');
  console.log('');

  // Step 2: Get live quotes and calculate limits
  const orders = [];
  for (const trade of TRADES) {
    console.log(`Fetching live quote for ${trade.symbol}...`);
    const quote = getLiveQuote(trade.symbol, trade.exchange, trade.currency, trade.primaryExchange);

    if (!quote) {
      console.error(`  ✗ No quote available for ${trade.symbol} — skipping`);
      continue;
    }

    console.log(`  bid=${quote.bid} ask=${quote.ask} last=${quote.last} close=${quote.close}`);
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

  // Step 3: Place orders
  const results = [];
  for (const order of orders) {
    const args = [
      'place-order',
      `--symbol ${order.symbol}`,
      `--exchange ${order.exchange}`,
      `--primary-exchange ${order.primaryExchange}`,
      `--currency ${order.currency}`,
      `--action ${order.action}`,
      `--quantity ${order.qty}`,
      `--order-type LMT`,
      `--limit-price ${order.limit}`,
      `--tif DAY`,
      '--json',
    ];

    if (DRY_RUN) {
      console.log(`[DRY-RUN] ${order.action} ${order.qty} ${order.symbol} @ ${order.limit} ${order.currency}`);
      results.push({ ...order, orderId: 'DRY', status: 'dry-run' });
      continue;
    }

    console.log(`Placing: ${order.action} ${order.qty} ${order.symbol} @ ${order.limit} ${order.currency}`);
    try {
      const raw = ibkr(args.join(' '));
      const result = JSON.parse(raw);
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
}

main().catch(err => {
  console.error('FATAL:', err.stack || String(err));
  process.exit(1);
});
