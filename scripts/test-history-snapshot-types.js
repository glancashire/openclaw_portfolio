const fs = require('fs');
const path = require('path');
const { appendHistorySnapshot, normalizeSnapshotType } = require('../src/analysis/historyWriter');

function main() {
  const tempDir = path.resolve('/tmp/openclaw-history-type-test');
  fs.mkdirSync(tempDir, { recursive: true });
  const holdingsPath = path.join(tempDir, 'holdings.md');
  const historyPath = path.join(tempDir, 'history.md');

  fs.writeFileSync(holdingsPath, `# Holdings\n\n## Last Sync\n- Total value CHF: 5000\n- Invested value CHF: 1000\n- Cash CHF: 4000\n`);
  fs.writeFileSync(historyPath, `# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n`);

  const approved = appendHistorySnapshot(historyPath, holdingsPath, 'execution_approved', 'approved note', { executionStatus: 'approved' });
  const partial = appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', 'partial fill note', { executionStatus: 'partially_filled' });
  const filled = appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', 'filled note', { executionStatus: 'filled' });
  const cancelled = appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', 'cancel note', { executionStatus: 'cancelled' });
  const inferredFailed = normalizeSnapshotType('execution_status', 'Broker order rejected by broker', {});

  console.log(JSON.stringify({ approved, partial, filled, cancelled, inferredFailed, history: fs.readFileSync(historyPath, 'utf8') }, null, 2));
}

main();
