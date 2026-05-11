const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { updateTradeRows, readTradesTable } = require('../src/execution/tradeState');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-runner-block-persistence-'));
const tradesPath = path.join(tempDir, 'trades.md');
fs.writeFileSync(tradesPath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 06:33:50 | approved | buy | CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | 6 | 157.08 | 942.48 | 0 | original reason | queued_for_open_runner |  | pricing_reference_unavailable | Broker returned quote data, but no usable live or delayed reference price fields were available for safe smart-limit construction. | 2026-05-11 09:10:00 | Retry at next intended market-open run after operator recovery. |\n`);

const rowsBefore = readTradesTable(tradesPath).rows;
assert(rowsBefore[0]['Block code'] === 'pricing_reference_unavailable', 'expected seeded block code');
assert(/retry/i.test(rowsBefore[0]['Next action']), 'expected retry next action');

updateTradeRows(tradesPath, { tickerOrIsin: 'CH0032912732', action: 'buy' }, (row) => ({
  ...row,
  Approval: 'queued_for_open_runner',
}));

const rowsAfter = readTradesTable(tradesPath).rows;
assert(rowsAfter[0]['Block code'] === 'pricing_reference_unavailable', 'expected queued row to preserve block code until a fresh quote validation clears it');
assert(/retry/i.test(rowsAfter[0]['Next action']), 'expected queued row to preserve retry next action');
assert(!/Ready for market-open submission/i.test(rowsAfter[0]['Next action']), 'did not expect premature ready wording');
console.log(JSON.stringify({ ok: true }, null, 2));
