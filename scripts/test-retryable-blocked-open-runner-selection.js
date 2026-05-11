'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { listExecutableTradeRows } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'retryable-open-runner-'));
  const tradesPath = path.join(tempDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 09:51:32 | approved | buy | AAA | ETF A | 1 | 100 | 100 | 0 | blocked row | queued_for_open_runner |  | pricing_reference_unavailable | stale block | 2026-05-11 09:51:32 | Retry at next intended market-open run after operator recovery. |\n| 2026-05-11 09:51:33 | approved | buy | BBB | ETF B | 1 | 100 | 100 | 0 | hard blocked row | queued_for_open_runner |  | market_data_entitlement_required | no entitlement | 2026-05-11 09:51:33 | Enable the required IBKR market-data entitlement for this venue/instrument, or rerun when a safe delayed-price policy exists. |\n`);

  const rows = listExecutableTradeRows(tradesPath);
  assert(rows.length === 1, `expected exactly one executable retryable row, got ${rows.length}`);
  assert(rows[0].tickerOrIsin === 'AAA', `expected AAA retryable row, got ${rows[0].tickerOrIsin}`);
  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
