'use strict';

const path = require('path');
const { buildTradeEmailHtml, buildTradeEmailText, buildNormalizedTradeContext } = require('./tradeNotificationEmail');
const { effectiveDeliveryPolicy } = require('../src/reporting/deliveryPolicy');
const { emailDeliveryReadiness, sendEmailMessage } = require('../src/reporting/emailDelivery');

const DEFAULT_PORTFOLIO_DIR = path.join(__dirname, '..', 'portfolio', 'etf');

async function notifyTradeFill({ trade, portfolio, openOrders = [], to = null, portfolioDir = DEFAULT_PORTFOLIO_DIR, sendEmailImpl = sendEmailMessage, notificationMode = 'live_fill' }) {
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const emailReadiness = emailDeliveryReadiness(policy, { pendingActions: [] });

  // Check email policy first — if disabled, return that before readiness checks
  if (!to && !emailReadiness.enabled) {
    return { attempted: false, sent: false, reason: 'email_disabled_by_policy', detail: emailReadiness.reason };
  }

  if (!to && !emailReadiness.ready) {
    return { attempted: false, sent: false, reason: 'email_not_ready', detail: emailReadiness.reason, missing: emailReadiness.missing };
  }

  // Phase A/D: check investor-email readiness before rendering/sending for live fills
  // Only gate when no explicit recipient — explicit `to` means the caller wants it sent
  const isLiveFill = notificationMode === 'live_fill';
  if (isLiveFill && !to) {
    const context = buildNormalizedTradeContext(trade, portfolio, { portfolioDir });
    if (!context.readiness.investorEmailReady) {
      const missing = [];
      if (!context.readiness.hasResultingTotalHeld) missing.push('resulting_total_held');
      if (!context.readiness.hasTrustedPortfolioTotals) missing.push('portfolio_totals');
      if (!context.readiness.hasTrustedPortfolioHoldings) missing.push('portfolio_holdings');
      console.log(`[tradeNotifier] Deferring live fill email for ${trade.symbol}: not investor-ready (missing: ${missing.join(', ')})`);
      return { attempted: false, sent: false, reason: 'not_investor_ready', missing };
    }
  }

  const html = buildTradeEmailHtml(trade, portfolio, openOrders, { portfolioDir });
  const tradeText = buildTradeEmailText(trade, portfolio, openOrders, { portfolioDir });
  const delayedBackfill = notificationMode === 'backfill';
  const subject = delayedBackfill
    ? `[Backfill] ${trade.action} ${trade.fillQty || trade.qty} ${trade.symbol} filled @ ${trade.fillPrice || trade.price} ${trade.currency}`
    : `${trade.action} ${trade.fillQty || trade.qty} ${trade.symbol} filled @ ${trade.fillPrice || trade.price} ${trade.currency}`;
  const text = [
    delayedBackfill
      ? `${trade.symbol} ${trade.action} fill confirmed (delayed notification backfill)`
      : `${trade.symbol} ${trade.action} fill confirmed`,
    '',
    tradeText,
  ].join('\n');

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
