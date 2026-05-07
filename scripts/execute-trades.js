'use strict';

/**
 * Execute approved trades via IB Gateway and send email notifications on fill.
 * Usage: node scripts/execute-trades.js [--dry-run]
 */

const { execSync } = require('child_process');
const path = require('path');
const { notifyTradeFill } = require('../lib/tradeExecutionNotifier');
const { validateTradeList } = require('../lib/etfQualityFilter');
const { isMarketOpen, nextOpenTime } = require('../lib/marketHours');

const IBKR_CLI = path.join(__dirname, '..', 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// Approved trades from the proposal
const TRADES = [
  { symbol: 'SLICHA', exchange: 'EBS', action: 'BUY', qty: 4, limit: 222.50, currency: 'CHF', name: 'UBS ETF SLI', targetPct: 20.0 },
  { symbol: 'EMUAA', exchange: 'EBS', action: 'BUY', qty: 27, limit: 40.30, currency: 'EUR', name: 'UBS MSCI EMU A Acc', targetPct: 20.0 },
  { symbol: 'CSPX', exchange: 'LSEETF', action: 'BUY', qty: 3, limit: 795.00, currency: 'USD', name: 'iShares Core S&P 500', targetPct: 40.0 },
];

function ibkr(args) {
  const cmd = `python3 ${IBKR_CLI} ${args}`;
  const out = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
  return out.trim();
}

function ibkrJson(args) {
  const raw = ibkr(`${args} --json`);
  try { return JSON.parse(raw); } catch { return raw; }
}

function placeOrder(trade) {
  const args = [
    'place-order',
    `--symbol ${trade.symbol}`,
    `--exchange ${trade.exchange}`,
    `--currency ${trade.currency}`,
    `--action ${trade.action}`,
    `--quantity ${trade.qty}`,
    `--order-type LMT`,
    `--limit-price ${trade.limit}`,
    '--json',
  ].join(' ');

  if (DRY_RUN) {
    console.log(`[DRY-RUN] Would place: ${trade.action} ${trade.qty} ${trade.symbol} @ ${trade.limit} ${trade.currency}`);
    return { orderId: 'DRY-' + Date.now(), status: 'dry-run' };
  }

  const raw = ibkr(args);
  try { return JSON.parse(raw); } catch { return { raw }; }
}

function getPositions() {
  return ibkrJson('positions');
}

function getAccountSummary() {
  const raw = ibkr('account-summary');
  const lines = raw.split('\n');
  const vals = {};
  for (const line of lines) {
    const m = line.match(/tag=(\w+)\s+value=([\d.]+)\s+currency=(\w+)/);
    if (m) vals[m[1]] = { value: parseFloat(m[2]), currency: m[3] };
  }
  return vals;
}

function getOpenOrders() {
  return ibkrJson('open-orders');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForFill(orderId, symbol, maxWaitMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await sleep(5000);
    const orders = getOpenOrders();
    const still = Array.isArray(orders) && orders.find(o => String(o.orderId) === String(orderId));
    if (!still) {
      // Order no longer open — check executions
      const execs = ibkrJson('executions');
      const fill = Array.isArray(execs) && execs.find(e => String(e.orderId) === String(orderId));
      return fill || { filled: true, orderId };
    }
  }
  return null; // timeout
}

async function buildPortfolioState(account) {
  const positions = getPositions();
  const summary = getAccountSummary();
  const totalValue = summary.NetLiquidation ? summary.NetLiquidation.value : 5000;
  const cash = summary.TotalCashValue ? summary.TotalCashValue.value : 0;

  const holdings = Array.isArray(positions) ? positions.map(p => {
    const valueChf = p.marketValue || (p.avgCost * p.position);
    const allocPct = totalValue > 0 ? (valueChf / totalValue) * 100 : 0;
    const target = TRADES.find(t => t.symbol === p.symbol);
    const targetPct = target ? target.targetPct : 0;
    return {
      symbol: p.symbol || p.contract?.symbol || '?',
      name: target ? target.name : '',
      valueChf,
      allocPct,
      targetPct,
      driftPct: allocPct - targetPct,
    };
  }) : [];

  return { name: 'ETF Portfolio', totalValueChf: totalValue, cashChf: cash, holdings };
}

async function main() {
  console.log(`=== Trade Execution ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'} ===`);

  // Guard: market hours
  if (!DRY_RUN && !FORCE) {
    const market = isMarketOpen('EBS');
    if (!market.open) {
      console.error(`\n✗ Market is closed: ${market.reason}`);
      console.error(`  Next open: ${nextOpenTime('EBS')}`);
      console.error(`  Use --force to override, or use scripts/submit-orders-at-open.js for smart execution.`);
      process.exit(1);
    }
  }

  // Guard: ETF quality filter
  const validation = validateTradeList(TRADES);
  if (!validation.allPass) {
    console.error('\n✗ ETF quality check FAILED:');
    for (const r of validation.results) {
      if (!r.pass) console.error(`  ${r.symbol}: ${r.reasons.join(', ')}`);
    }
    process.exit(1);
  }
  console.log('✓ ETF quality filter passed');

  console.log(`Trades to execute: ${TRADES.length}`);
  console.log('');

  const results = [];

  for (const trade of TRADES) {
    console.log(`Placing: ${trade.action} ${trade.qty} ${trade.symbol} @ ${trade.limit} ${trade.currency} on ${trade.exchange}`);

    const orderResult = placeOrder(trade);
    console.log(`  Order result:`, JSON.stringify(orderResult));

    const orderId = orderResult.orderId || orderResult.order?.orderId || orderResult.raw;
    results.push({ ...trade, orderId, orderResult });

    if (DRY_RUN) continue;

    // Wait for fill
    console.log(`  Waiting for fill (up to 2 min)...`);
    const fill = await waitForFill(orderId, trade.symbol);

    if (fill) {
      console.log(`  ✓ Filled!`, JSON.stringify(fill));

      // Build current state and send notification
      const portfolio = await buildPortfolioState();
      const openOrders = getOpenOrders();
      const openList = Array.isArray(openOrders) ? openOrders.map(o => ({
        symbol: o.contract?.symbol || o.symbol || '?',
        action: o.action || o.order?.action || '?',
        qty: o.totalQuantity || o.order?.totalQuantity || '?',
        limitPrice: o.lmtPrice || o.order?.lmtPrice || '?',
        currency: o.contract?.currency || '?',
        status: o.status || o.orderStatus?.status || 'Submitted',
      })) : [];

      await notifyTradeFill({
        trade: {
          symbol: trade.symbol,
          action: trade.action,
          qty: trade.qty,
          price: trade.limit,
          fillPrice: fill.price || fill.avgPrice || trade.limit,
          fillQty: fill.shares || fill.cumQty || trade.qty,
          currency: trade.currency,
          costChf: (fill.price || trade.limit) * trade.qty,
          fees: fill.commission || 1.50,
          orderId: String(orderId),
          time: fill.time || new Date().toISOString().slice(0, 16),
        },
        portfolio,
        openOrders: openList,
      });
    } else {
      console.log(`  ⏳ Not filled within timeout — order remains open`);
    }

    // Small delay between orders
    if (!DRY_RUN) await sleep(2000);
  }

  console.log('');
  console.log('=== Execution Summary ===');
  for (const r of results) {
    console.log(`  ${r.action} ${r.qty} ${r.symbol}: orderId=${r.orderId}`);
  }

  if (DRY_RUN) {
    console.log('\n(Dry run — no orders placed)');
  }
}

main().catch(err => {
  console.error('FATAL:', err.stack || String(err));
  process.exit(1);
});
