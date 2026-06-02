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
const { loadFillNotificationState, saveFillNotificationState, markFillsNotified } = require('../src/reporting/fillNotificationState');

const IBKR_CLI = path.join(__dirname, '..', 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
const ROOT = path.join(__dirname, '..');
const DEFAULT_PORTFOLIO_DIR = path.join(ROOT, 'portfolio', 'etf');

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
      reason: String(row.Reason || '').trim(),
      dateTime: String(row['Date/time'] || '').trim(),
    }))
    .filter((row) => Number.isFinite(row.orderId) && row.orderId > 0)
    .filter((row) => ['submitted', 'partially_filled', 'filled', 'failed', 'cancelled', 'inactive'].includes(row.status));
}

async function main() {
  console.log(`[monitor] Checking fills at ${new Date().toISOString()}`);

  const knownOrders = loadKnownOrders();
  const openOrders = ibkrJson('open-orders') || [];
  const executions = ibkrJson('executions') || [];

  let state = loadFillNotificationState(ROOT);
  const openOrderIds = new Set(openOrders.map(o => Number(o.orderId)));

  let newFills = 0;
  for (const order of knownOrders) {
    if (state.notifiedFills.includes(order.orderId)) continue;
    const isBackfill = state.reconciledUnnotifiedFills.includes(order.orderId);
    if (openOrderIds.has(order.orderId)) continue;

    const fill = executions.find(e => Number(e.orderId) === Number(order.orderId));
    const syntheticBackfill = !fill && isBackfill && order.status === 'filled'
      ? {
          time: order.dateTime,
          symbol: order.symbol,
          side: order.action,
          shares: order.qty,
          price: order.actualChf > 0 && order.qty > 0 ? (order.actualChf / order.qty) : order.limit,
          orderId: order.orderId,
          execId: `backfill-${order.orderId}`,
          currency: 'CHF',
        }
      : null;
    const effectiveFill = fill || syntheticBackfill;
    if (!effectiveFill) {
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
        name: p.contract?.description || p.contract?.localSymbol || p.contract?.symbol || '',
        quantityHeld: p.position || p.pos || null,
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

    const fillPrice = effectiveFill ? (effectiveFill.price || effectiveFill.avgPrice || order.limit) : order.limit;
    const fillQty = effectiveFill ? (effectiveFill.shares || effectiveFill.cumQty || order.qty) : order.qty;

    console.log(`[monitor] Sending ${isBackfill ? 'backfill ' : ''}fill notification for ${order.symbol}`);
    const notification = await notifyTradeFill({
      trade: {
        symbol: order.symbol,
        action: order.action,
        qty: order.qty,
        price: order.limit,
        fillPrice,
        fillQty,
        currency: effectiveFill?.currency || 'CHF',
        costChf: order.actualChf || (fillPrice * fillQty),
        fees: 1.50,
        orderId: String(order.orderId),
        time: effectiveFill ? effectiveFill.time : new Date().toISOString().slice(0, 16),
      },
      portfolio,
      openOrders: remainingOpen,
      portfolioDir: DEFAULT_PORTFOLIO_DIR,
      notificationMode: isBackfill ? 'backfill' : 'live_fill',
    });

    if (notification && notification.sent) {
      state = markFillsNotified(state, [order.orderId]);
      newFills++;
    } else if (notification && notification.reason === 'not_investor_ready') {
      // Phase D: don't mark as notified — retry on next monitor pass
      console.log(`[monitor] Fill ${order.symbol} (${order.orderId}) deferred: ${notification.missing?.join(', ') || 'not investor ready'}. Will retry next pass.`);
    } else {
      console.log(`[monitor] Notification not recorded for ${order.symbol} (${order.orderId}): ${notification?.reason || notification?.error || 'send_not_confirmed'}`);
    }
  }

  saveFillNotificationState(ROOT, state);

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
