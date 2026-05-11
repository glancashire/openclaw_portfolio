const fs = require('fs');
const path = require('path');
const { readTradesTable } = require('../src/execution/tradeState');

const ROOT = path.resolve(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'runtime', 'fill-notifications-state.json');
const DEFAULT_PORTFOLIO_DIR = path.join(ROOT, 'portfolio', 'etf');

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

function main(portfolioDir = DEFAULT_PORTFOLIO_DIR) {
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const { rows } = readTradesTable(tradesPath);
  const state = loadState();
  const notified = new Set(state.notifiedFills.map(Number));
  const reconciled = new Set(state.reconciledUnnotifiedFills.map(Number));

  const candidates = rows
    .filter((row) => String(row.Status || '').trim().toLowerCase() === 'filled')
    .map((row) => Number(row['Broker order id'] || 0))
    .filter((orderId) => Number.isFinite(orderId) && orderId > 0)
    .filter((orderId) => !notified.has(orderId) && !reconciled.has(orderId));

  for (const orderId of candidates) reconciled.add(orderId);

  const next = {
    notifiedFills: Array.from(notified).sort((a, b) => a - b),
    reconciledUnnotifiedFills: Array.from(reconciled).sort((a, b) => a - b),
  };
  saveState(next);
  console.log(JSON.stringify({ ok: true, added: candidates, state: next }, null, 2));
}

main(process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_PORTFOLIO_DIR);
