'use strict';

/* Phase 189 — Mirror basket-run leg outcomes into trades.md as new rows. */

const fs = require('fs');
const path = require('path');
const { appendTradeEvent, readTradesTable } = require('./tradeState');

function legAlreadyMirrored(rows, brokerOrderId, instrument) {
  if (!brokerOrderId) return false;
  const orderId = String(brokerOrderId);
  return rows.some((row) => {
    const rowOrderId = String(row['Broker order id'] || '').trim();
    if (rowOrderId !== orderId) return false;
    // If instrument is provided, also match on ticker/ISIN to avoid false positives
    // from corrupted rows that share the same stale order ID
    if (instrument) {
      const rowTicker = String(row['Ticker / ISIN'] || '').trim().toUpperCase();
      if (rowTicker && rowTicker !== String(instrument).toUpperCase()) return false;
    }
    return true;
  });
}

function mirrorBasketRunToTrades({ portfolioDir, runState, now = new Date() }) {
  const tradesPath = path.join(portfolioDir, 'trades.md');
  if (!fs.existsSync(tradesPath)) {
    return { ok: false, reason: 'trades_md_missing', appended: 0 };
  }
  const { rows } = readTradesTable(tradesPath);

  let appended = 0;
  const skipped = [];
  const mirrored = [];

  for (const leg of Object.values(runState.legs || {})) {
    if (!['filled', 'cancelled'].includes(leg.status)) continue;
    if (legAlreadyMirrored(rows, leg.brokerOrderId, leg.instrument)) {
      skipped.push({ brokerOrderId: leg.brokerOrderId, reason: 'already_mirrored' });
      continue;
    }
    const event = {
      status: leg.status,
      action: 'buy',
      tickerOrIsin: leg.instrument,
      name: leg.ibkrSymbol || leg.instrument,
      quantity: leg.fillQuantity || 0,
      limitPrice: leg.avgFillPrice || 0,
      estimatedChf: 0,
      actualChf: leg.fillQuantity && leg.avgFillPrice ? Number((leg.fillQuantity * leg.avgFillPrice).toFixed(2)) : 0,
      reason: leg.status === 'cancelled' ? (leg.cancelledReason || 'cancelled by broker') : 'basket fill',
      approval: 'basket_approved',
      brokerOrderId: leg.brokerOrderId || '',
      nextAction: leg.status === 'cancelled' ? 'Re-propose with refreshed quote' : '',
    };
    const timestamp = (typeof now === 'string' ? now : now.toISOString()).replace('T', ' ').slice(0, 19);
    appendTradeEvent(tradesPath, event, timestamp);
    mirrored.push({ brokerOrderId: leg.brokerOrderId, status: leg.status, instrument: leg.instrument });
    appended += 1;
  }

  return { ok: true, appended, skipped, mirrored };
}

module.exports = { mirrorBasketRunToTrades, legAlreadyMirrored };
