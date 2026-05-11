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
const { readTradesTable } = require('../src/execution/tradeState');

const IBKR_CLI = path.join(__dirname, '..', 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
const STATE_FILE = path.join(__dirname, '..', 'runtime', 'fill-notifications-state.json');
const DEFAULT_PORTFOLIO_DIR = path.join(__dirname, '..', 'portfolio', 'etf');

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
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return {
      notifiedFills: Array.isArray(parsed?.notifiedFills) ? parsed.notifiedFills : [],
      reconciledUnnotifiedFills: Array.isArray(parsed?.reconciledUnnotifiedFills) ? parsed.reconciledUnnotifiedFills : [],
    };
  } catch {
    return { notifiedFills: [], reconciledUnnotifiedFills: [] };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadKnownOrders(portfolioDir = DEFAULT_PORTFOLIO_DIR) {
  const tradesPath = path.join(portfolioDir, 'trades.md');
  if (!fs.existsSync(tradesPath)) return [];
  const { rows } = readTradesTable(tradesPath);
  return rows
    .map((row) => ({
      orderId: Number(row['Broker order id'] || 0),
      symbol: String(row['Ticker / ISIN'] || '').trim(),
      name: String(row.Name || '').trim(),
      action: String(row.Action || '').trim().toUpperCase(),
      qty: Number(row.Quantity || 0),
      limit: Number(row['Limit price'] || 0),
      estimatedChf: Number(row['Estimated CHF'] || 0),
      actualChf: Number(row['Actual CHF'] || 0),
      status: String(row.Status || '').trim().toLowerCase(),
    }))
    .filter((row) => Number.isFinite(row.orderId) && row.orderId > 0)
    .filter((row) => ['submitted', 'partially_filled', 'filled', 'failed', 'cancelled', 'inactive'].includes(row.status));
}

async function main() {
  console.log(`[monitor] Checking fills at ${new Date().toISOString()}`);

  const knownOrders = loadKnownOrders();
  const openOrders = ibkrJson('open-orders') || [];
  const executions = ibkrJson('executions') || [];

  const state = loadState();
  const openOrderIds = new Set(openOrders.map(o => Number(o.orderId)));

  let newFills = 0;
  for (const order of knownOrders) {
    if (state.notifiedFills.includes(order.orderId)) continue;
    if (state.reconciledUnnotifiedFills.includes(order.orderId)) continue;
    if (openOrderIds.has(order.orderId)) continue;

    const fill = executions.find(e => Number(e.orderId) === Number(order.orderId));
    if (!fill) {
      console.log(`[monitor] Order ${order.orderId} (${order.symbol}) no longer open but no fill record found — likely cancelled/inactive`);
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
      return {
        symbol: p.contract?.symbol || p.symbol || '?',
        name: '',
        valueChf: mv,
        allocPct,
        targetPct: 0,
        driftPct: allocPct,
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
        currency: fill?.currency || 'CHF',
        costChf: order.actualChf || (fillPrice * fillQty),
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
