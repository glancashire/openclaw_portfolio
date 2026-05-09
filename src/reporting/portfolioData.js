const fs = require('fs');

function tableRowsFromFile(filePath, headingStartsWith) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().startsWith(headingStartsWith));
  if (start === -1) return [];
  const tableLines = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ') && tableLines.length) break;
    if (line.startsWith('|')) tableLines.push(line);
  }
  return tableLines.slice(2).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function parseTradeRow(row) {
  return {
    date: row[0] || '',
    status: row[1] || '',
    action: row[2] || '',
    tickerOrIsin: row[3] || '',
    instrument: row[4] || row[3] || '',
    quantity: row[5] || '0',
    limitPrice: row[6] || '0',
    estimatedChf: row[7] || '0',
    amount: row[7] || '0',
    actualChf: row[8] || '0',
    reason: row[9] || '',
    approval: row[10] || '',
    brokerOrderId: row[11] || '',
  };
}

function recentTrades(tradesPath, limit = 5) {
  const rows = tableRowsFromFile(tradesPath, '## Trade Log');
  return rows.slice(-limit).reverse().map(parseTradeRow);
}

function latestTradeProposals(tradesPath) {
  const rows = tableRowsFromFile(tradesPath, '## Trade Log').map(parseTradeRow);
  if (!rows.length) return [];

  const latestByInstrument = new Map();
  for (const row of rows) {
    const key = `${row.tickerOrIsin}::${row.action}`;
    latestByInstrument.set(key, row);
  }

  return Array.from(latestByInstrument.values()).filter((row) => {
    const status = String(row.status || '').trim().toLowerCase();
    return ['proposed', 'planned', 'approved', 'staged', 'submitted', 'partially_filled'].includes(status);
  });
}

function latestHistory(historyPath) {
  const rows = tableRowsFromFile(historyPath, '## Daily Valuation History');
  if (!rows.length) return null;
  const row = rows[rows.length - 1];
  return {
    date: row[0] || '',
    snapshot: row[1] || '',
    totalValue: row[2] || '0',
    invested: row[3] || '0',
    cash: row[4] || '0',
    dailyChange: row[5] || '0',
    dailyChangePct: row[6] || '0',
    notes: row[7] || '',
  };
}

function executionLifecycleSummary(tradesPath) {
  const rows = tableRowsFromFile(tradesPath, '## Trade Log').map(parseTradeRow);
  const summary = {
    proposed: 0,
    approved: 0,
    rejected: 0,
    staged: 0,
    submitted: 0,
    partiallyFilled: 0,
    filled: 0,
    cancelled: 0,
    failed: 0,
    simulated: 0,
    planned: 0,
    withBrokerOrderId: 0,
  };
  for (const row of rows) {
    const status = String(row.status || '').trim().toLowerCase();
    if (status === 'proposed') summary.proposed += 1;
    else if (status === 'approved') summary.approved += 1;
    else if (status === 'rejected') summary.rejected += 1;
    else if (status === 'staged') summary.staged += 1;
    else if (status === 'submitted') summary.submitted += 1;
    else if (status === 'partially_filled') summary.partiallyFilled += 1;
    else if (status === 'filled') summary.filled += 1;
    else if (status === 'cancelled') summary.cancelled += 1;
    else if (status === 'failed') summary.failed += 1;
    else if (status === 'simulated') summary.simulated += 1;
    else if (status === 'planned') summary.planned += 1;
    if (String(row.brokerOrderId || '').trim()) summary.withBrokerOrderId += 1;
  }
  return summary;
}

module.exports = { recentTrades, latestTradeProposals, latestHistory, executionLifecycleSummary };
