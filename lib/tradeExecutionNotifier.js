'use strict';

const { sendEmail } = require('./mailgun');
const { buildTradeEmailHtml } = require('./tradeNotificationEmail');

const DEFAULT_RECIPIENT = 'lancashire@swift.ch';

/**
 * Send a trade fill notification email.
 *
 * @param {object} opts
 * @param {object} opts.trade - Fill details
 * @param {object} opts.portfolio - Current portfolio state
 * @param {Array}  opts.openOrders - Remaining open orders
 * @param {string} [opts.to] - Recipient (defaults to lancashire@swift.ch)
 * @returns {Promise<object>} Mailgun response
 */
async function notifyTradeFill({ trade, portfolio, openOrders = [], to = DEFAULT_RECIPIENT }) {
  const html = buildTradeEmailHtml(trade, portfolio, openOrders);
  const subject = `${trade.action} ${trade.fillQty || trade.qty} ${trade.symbol} filled @ ${trade.fillPrice || trade.price} ${trade.currency}`;

  try {
    const result = await sendEmail({
      to,
      subject,
      text: `${trade.action} ${trade.qty} ${trade.symbol} filled at ${trade.fillPrice || trade.price} ${trade.currency}. Portfolio value: CHF ${trade.costChf ? Number(portfolio.totalValueChf).toFixed(2) : '—'}`,
      html,
    });
    console.log(`[tradeNotifier] Email sent: ${result.id || 'ok'}`);
    return result;
  } catch (err) {
    console.error(`[tradeNotifier] Email failed (non-blocking): ${err.message}`);
    return { error: err.message };
  }
}

module.exports = { notifyTradeFill, DEFAULT_RECIPIENT };
