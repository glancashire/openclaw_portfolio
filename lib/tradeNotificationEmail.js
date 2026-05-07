'use strict';

/**
 * Build a styled HTML email for a completed trade notification.
 *
 * @param {object} trade - { symbol, action, qty, price, currency, fillPrice, fillQty, costChf, fees, orderId, time }
 * @param {object} portfolio - { name, totalValueChf, cashChf, holdings: [{ symbol, name, valueChf, allocPct, targetPct, driftPct }] }
 * @param {Array} openOrders - [{ symbol, action, qty, limitPrice, currency, status }]
 * @returns {string} HTML email body
 */
function buildTradeEmailHtml(trade, portfolio, openOrders = []) {
  const statusColor = trade.action === 'BUY' ? '#16a34a' : '#dc2626';
  const actionLabel = trade.action === 'BUY' ? '🟢 BUY' : '🔴 SELL';

  const holdingsRows = (portfolio.holdings || []).map(h => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${h.symbol}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${h.name || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">CHF ${fmt(h.valueChf)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${h.allocPct.toFixed(1)}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${h.targetPct.toFixed(1)}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:${h.driftPct > 0 ? '#16a34a' : h.driftPct < 0 ? '#dc2626' : '#6b7280'};">${h.driftPct > 0 ? '+' : ''}${h.driftPct.toFixed(1)}%</td>
    </tr>
  `).join('');

  const openOrdersSection = openOrders.length === 0 ? `
    <p style="color:#6b7280;font-style:italic;">No open orders remaining.</p>
  ` : `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Symbol</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Action</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Qty</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Limit</th>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${openOrders.map(o => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${o.symbol}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${o.action}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${o.qty}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${o.limitPrice} ${o.currency}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${o.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <div style="max-width:640px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:${statusColor};padding:20px 24px;color:#ffffff;">
      <h1 style="margin:0;font-size:20px;font-weight:600;">${actionLabel} ${trade.symbol} — Order Filled</h1>
      <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">${portfolio.name} • ${trade.time || new Date().toISOString().slice(0, 16)}</p>
    </div>

    <!-- Trade Details -->
    <div style="padding:24px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#374151;">Trade Details</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#6b7280;">Symbol</td><td style="padding:6px 0;font-weight:600;">${trade.symbol}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Action</td><td style="padding:6px 0;">${trade.action}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Quantity</td><td style="padding:6px 0;">${trade.fillQty || trade.qty}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Fill Price</td><td style="padding:6px 0;">${trade.fillPrice || trade.price} ${trade.currency}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Cost (CHF)</td><td style="padding:6px 0;font-weight:600;">CHF ${fmt(trade.costChf)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Fees</td><td style="padding:6px 0;">CHF ${fmt(trade.fees || 0)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Order ID</td><td style="padding:6px 0;font-family:monospace;font-size:13px;">${trade.orderId || '—'}</td></tr>
      </table>
    </div>

    <!-- Portfolio State -->
    <div style="padding:0 24px 24px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#374151;">Portfolio After Trade</h2>
      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:12px;color:#6b7280;">Total Value</div>
          <div style="font-size:18px;font-weight:700;color:#111827;">CHF ${fmt(portfolio.totalValueChf)}</div>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:12px;color:#6b7280;">Cash</div>
          <div style="font-size:18px;font-weight:700;color:#111827;">CHF ${fmt(portfolio.cashChf)}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Symbol</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Name</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Value</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Alloc</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Target</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Drift</th>
          </tr>
        </thead>
        <tbody>
          ${holdingsRows}
          <tr style="background:#f9fafb;font-weight:600;">
            <td style="padding:8px 12px;" colspan="2">Cash</td>
            <td style="padding:8px 12px;text-align:right;">CHF ${fmt(portfolio.cashChf)}</td>
            <td style="padding:8px 12px;text-align:right;">${((portfolio.cashChf / portfolio.totalValueChf) * 100).toFixed(1)}%</td>
            <td style="padding:8px 12px;text-align:right;">20.0%</td>
            <td style="padding:8px 12px;text-align:right;color:${(portfolio.cashChf / portfolio.totalValueChf * 100 - 20) > 0 ? '#16a34a' : '#dc2626'};">${((portfolio.cashChf / portfolio.totalValueChf * 100) - 20).toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Open Orders -->
    <div style="padding:0 24px 24px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#374151;">Open Orders</h2>
      ${openOrdersSection}
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">OpenClaw Portfolio Manager • Account U25624150</p>
    </div>
  </div>
</body>
</html>`;
}

function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = { buildTradeEmailHtml };
