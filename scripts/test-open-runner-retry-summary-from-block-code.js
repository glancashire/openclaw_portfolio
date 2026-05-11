const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { summarizeOpenRunnerRetryState } = require('../src/execution/tradeState');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-runner-retry-summary-'));
const tradesPath = path.join(tempDir, 'trades.md');
fs.writeFileSync(tradesPath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 06:33:50 | approved | buy | AAA | Retryable blocked row | 1 | 10 | 10 | 0 | retry row | queued_for_open_runner |  | pricing_reference_unavailable | missing ref price | 2026-05-11 09:10:00 | Waiting for fresh pricing. |\n| 2026-05-11 06:34:50 | approved | buy | BBB | First handoff row | 1 | 10 | 10 | 0 | initial row | queued_for_open_runner |  |  |  |  | First open-runner attempt pending. |\n`);

const summary = summarizeOpenRunnerRetryState(tradesPath);
assert.strictEqual(summary.queuedRetry, 1, `expected one retry row, got ${summary.queuedRetry}`);
assert.strictEqual(summary.queuedInitial, 1, `expected one first-handoff row, got ${summary.queuedInitial}`);
console.log(JSON.stringify({ ok: true }, null, 2));
