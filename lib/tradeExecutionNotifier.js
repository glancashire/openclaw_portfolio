'use strict';

const path = require('path');
const { buildTradeEmailHtml } = require('./tradeNotificationEmail');
const { effectiveDeliveryPolicy } = require('../src/reporting/deliveryPolicy');
const { emailDeliveryReadiness, sendEmailMessage } = require('../src/reporting/emailDelivery');

const DEFAULT_PORTFOLIO_DIR = path.join(__dirname, '..', 'portfolio', 'etf');

async function notifyTradeFill({ trade, portfolio, openOrders = [], to = null, portfolioDir = DEFAULT_PORTFOLIO_DIR, sendEmailImpl = sendEmailMessage, notificationMode = 'live_fill' }) {
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const emailReadiness = emailDeliveryReadiness(policy, { pendingActions: [] });
  const html = buildTradeEmailHtml(trade, portfolio, openOrders);
  const delayedBackfill = notificationMode === 'backfill';
  const subject = delayedBackfill
    ? `[Backfill] ${trade.action} ${trade.fillQty || trade.qty} ${trade.symbol} filled @ ${trade.fillPrice || trade.price} ${trade.currency}`
    : `${trade.action} ${trade.fillQty || trade.qty} ${trade.symbol} filled @ ${trade.fillPrice || trade.price} ${trade.currency}`;
  const text = [
    delayedBackfill
      ? `${trade.symbol} ${trade.action} fill confirmed (delayed notification backfill)`
      : `${trade.symbol} ${trade.action} fill confirmed`,
    `Gross trade impact: CHF ${Number(trade.costChf || 0).toFixed(2)}`,
    `Portfolio value: CHF ${portfolio && Number.isFinite(Number(portfolio.totalValueChf)) ? Number(portfolio.totalValueChf).toFixed(2) : '—'}`,
    `Cash balance: CHF ${portfolio && Number.isFinite(Number(portfolio.cashChf)) ? Number(portfolio.cashChf).toFixed(2) : '—'}`,
    openOrders.length ? `Remaining open orders: ${openOrders.length}` : 'Remaining open orders: none',
  ].join('\n');

  if (!to && !emailReadiness.enabled) {
    return { attempted: false, sent: false, reason: 'email_disabled_by_policy', detail: emailReadiness.reason };
  }

  if (!to && !emailReadiness.ready) {
    return { attempted: false, sent: false, reason: 'email_not_ready', detail: emailReadiness.reason, missing: emailReadiness.missing };
  }

  try {
    const result = await sendEmailImpl({
      policy,
      to,
      subject,
      text,
      html,
    });
    console.log(`[tradeNotifier] Email sent: ${result.id || 'ok'}`);
    return { attempted: true, sent: true, result };
  } catch (err) {
    console.error(`[tradeNotifier] Email failed (non-blocking): ${err.message}`);
    return { attempted: true, sent: false, error: err.message };
  }
}

module.exports = { notifyTradeFill, DEFAULT_PORTFOLIO_DIR };
