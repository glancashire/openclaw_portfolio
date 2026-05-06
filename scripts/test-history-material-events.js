const fs = require('fs');
const path = require('path');
const { appendHistorySnapshot } = require('../src/analysis/historyWriter');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const dir = path.resolve(process.argv[2] || '/tmp/history-material-events');
  fs.mkdirSync(dir, { recursive: true });
  const holdingsPath = path.join(dir, 'holdings.md');
  const historyPath = path.join(dir, 'history.md');

  fs.writeFileSync(holdingsPath, `# Holdings: Test\n\n## Last Sync\n- Date/time: 2026-05-05 07:00:00\n- Source: test\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 1000\n- Cash CHF: 500\n- Invested value CHF: 500\n`);
  fs.writeFileSync(historyPath, '# History: Test\n\n## Daily Snapshots\n\n| Date | Snapshot | Total CHF | Invested CHF | Cash CHF | Realized P/L CHF | Unrealized P/L CHF | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n');

  const first = appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', 'Broker order 123 status sync: Submitted', { executionStatus: 'submitted' });
  const second = appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', 'Broker order 123 status sync: Filled', { executionStatus: 'filled' });
  const lines = fs.readFileSync(historyPath, 'utf8').trim().split(/\r?\n/).filter((line) => line.startsWith('| 2026-'));

  assert(first.appended === true, 'Expected first material event snapshot to append.');
  assert(second.appended === true, 'Expected second material event snapshot to append.');
  assert(lines.length === 2, `Expected two material event rows, got ${lines.length}`);

  console.log(JSON.stringify({ first, second, lines }, null, 2));
}

main();
