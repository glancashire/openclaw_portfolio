'use strict';

/**
 * Monitor open orders for fills and send email notifications.
 * Designed to be run periodically (e.g. every 60s during market hours).
 * Tracks which fills have already been notified via a state file.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { notifyTradeFill } = require('../lib/tradeExecutionNotifier');

const IBKR_CLI = path.join(__dirname, '..', 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
const STATE_FILE = path.join(__dirname, '..', 'runtime', 'fill-notifications-state.json');

const KNOWN_ORDERS = [
  { orderId: 8, symbol: 'SLICHA', name: 'UBS ETF SLI', action: 'BUY', qty: 4, limit: 222.50, currency: 'CHF', targetPct: 20.0 },
  { orderId: 12, symbol: 'EMUAA', name: 'UBS MSCI EMU A Acc', action: 'BUY', qty: 27, limit: 40.30, currency: 'EUR', targetPct: 20.0 },
  { orderId: 40, symbol: 'VUSA', name: 'Vanguard S&P 500 UCITS', action: 'BUY', qty: 18, limit: 109.50, currency: 'CHF', targetPct: 40.0 },
];

function ibkrJson(args) {
  const cmd = `python3 ${IBKR_CLI} ${args} --json`;
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return JSON.parse(out.trim());
  } catch (e) {
    console.error(`[monitor] ibkr command failed: ${e.message}`);
    return null;
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { notifiedFills: [] };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function main() {
  console.log(`[monitor] Checking fills at ${new Date().toISOString()}`);

  // Get current open orders
  const openOrders = ibkrJson('open-orders') || [];
  const executions = ibkrJson('executions') || [];

  const state = loadState();
  const openOrderIds = new Set(openOrders.map(o => o.orderId));

  // Check which known orders are no longer open (= filled or cancelled)
  let newFills = 0;
  for (const order of KNOWN_ORDERS) {
    if (state.notifiedFills.includes(order.orderId)) continue;
    if (openOrderIds.has(order.orderId)) continue;

    // Order is no longer open — check if it was filled
    const fill = executions.find(e => e.orderId === order.orderId);
    if (!fill && openOrders.length > 0) {
      // Might be cancelled, skip
      console.log(`[monitor] Order ${order.orderId} (${order.symbol}) no longer open but no fill found — may be cancelled`);
      continue;
    }

    // Build portfolio state
    const positions = ibkrJson('positions') || [];
    const summary = ibkrJson('account-summary');
    let totalValue = 5000, cash = 5000;
    if (summary) {
      const lines = (typeof summary === 'string' ? summary : '').split('\n');
      // Parse from raw if needed
    }
    // Simpler: use positions to estimate
    const accountRaw = execSync(`python3 ${IBKR_CLI} account-summary`, { encoding: 'utf8', timeout: 20000 });
    const nlMatch = accountRaw.match(/tag=NetLiquidation\s+value=([\d.]+)/);
    const cashMatch = accountRaw.match(/tag=TotalCashValue\s+value=([\d.]+)/);
    totalValue = nlMatch ? parseFloat(nlMatch[1]) : 5000;
    cash = cashMatch ? parseFloat(cashMatch[1]) : 5000;

    const holdings = positions.map(p => {
      const mv = p.marketValue || (p.avgCost * p.position);
      const allocPct = totalValue > 0 ? (mv / totalValue) * 100 : 0;
      const known = KNOWN_ORDERS.find(k => k.symbol === (p.contract?.symbol || p.symbol));
      return {
        symbol: p.contract?.symbol || p.symbol || '?',
        name: known ? known.name : '',
        valueChf: mv,
        allocPct,
        targetPct: known ? known.targetPct : 0,
        driftPct: allocPct - (known ? known.targetPct : 0),
      };
    });

    const portfolio = { name: 'ETF Portfolio', totalValueChf: totalValue, cashChf: cash, holdings };

    const remainingOpen = openOrders.map(o => ({
      symbol: o.symbol || o.contract?.symbol || '?',
      action: o.action || 'BUY',
      qty: o.quantity || o.remaining || 0,
      limitPrice: o.lmtPrice || order.limit,
      currency: order.currency,
      status: o.status || 'Submitted',
    }));

    const fillPrice = fill ? (fill.price || fill.avgPrice || order.limit) : order.limit;
    const fillQty = fill ? (fill.shares || fill.cumQty || order.qty) : order.qty;

    console.log(`[monitor] Sending fill notification for ${order.symbol}`);
    await notifyTradeFill({
      trade: {
        symbol: order.symbol,
        action: order.action,
        qty: order.qty,
        price: order.limit,
        fillPrice,
        fillQty,
        currency: order.currency,
        costChf: fillPrice * fillQty,
        fees: 1.50,
        orderId: String(order.orderId),
        time: fill ? fill.time : new Date().toISOString().slice(0, 16),
      },
      portfolio,
      openOrders: remainingOpen,
    });

    state.notifiedFills.push(order.orderId);
    newFills++;
  }

  saveState(state);

  if (newFills === 0) {
    console.log(`[monitor] No new fills. Open orders: ${openOrders.length}`);
  } else {
    console.log(`[monitor] Sent ${newFills} fill notification(s).`);
  }

  // Summary
  console.log(`[monitor] Open orders remaining: ${openOrders.length}`);
  for (const o of openOrders) {
    console.log(`  - ${o.symbol} ${o.action} ${o.quantity} @ ${o.status}`);
  }
}

main().catch(err => {
  console.error('[monitor] FATAL:', err.stack || String(err));
  process.exit(1);
});
