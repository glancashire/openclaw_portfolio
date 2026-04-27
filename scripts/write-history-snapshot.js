const path = require('path');
const { appendHistorySnapshot } = require('../src/analysis/historyWriter');

const portfolioDir = process.argv[2];
const snapshot = process.argv[3] || 'end_of_day';
const notes = process.argv[4] || '';
if (!portfolioDir) {
  console.error('Usage: node scripts/write-history-snapshot.js <portfolio-dir> [snapshot] [notes]');
  process.exit(1);
}

const result = appendHistorySnapshot(
  path.join(portfolioDir, 'history.md'),
  path.join(portfolioDir, 'holdings.md'),
  snapshot,
  notes,
);
console.log(JSON.stringify(result, null, 2));
