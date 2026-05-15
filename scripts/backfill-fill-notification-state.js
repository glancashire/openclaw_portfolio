const path = require('path');
const { readTradesTable } = require('../src/execution/tradeState');
const { loadFillNotificationState, saveFillNotificationState } = require('../src/reporting/fillNotificationState');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PORTFOLIO_DIR = path.join(ROOT, 'portfolio', 'etf');

function main(portfolioDir = DEFAULT_PORTFOLIO_DIR) {
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const { rows } = readTradesTable(tradesPath);
  const state = loadFillNotificationState(ROOT);
  const notified = new Set(state.notifiedFills.map(Number));
  const reconciled = new Set(state.reconciledUnnotifiedFills.map(Number));
  const acknowledged = new Set((state.acknowledgedBackfilledFills || []).map(Number));

  const candidates = rows
    .filter((row) => String(row.Status || '').trim().toLowerCase() === 'filled')
    .map((row) => Number(row['Broker order id'] || 0))
    .filter((orderId) => Number.isFinite(orderId) && orderId > 0)
    .filter((orderId) => !notified.has(orderId) && !reconciled.has(orderId) && !acknowledged.has(orderId));

  for (const orderId of candidates) reconciled.add(orderId);

  const next = {
    notifiedFills: Array.from(notified).sort((a, b) => a - b),
    reconciledUnnotifiedFills: Array.from(reconciled).sort((a, b) => a - b),
    acknowledgedBackfilledFills: Array.from(acknowledged).sort((a, b) => a - b),
  };
  saveFillNotificationState(ROOT, next);
  console.log(JSON.stringify({ ok: true, added: candidates, state: next }, null, 2));
}

main(process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_PORTFOLIO_DIR);
