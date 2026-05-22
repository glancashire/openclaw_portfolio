'use strict';

/* Phase 189 — mirrorBasketRunToTrades unit + integration tests. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mirrorBasketRunToTrades, legAlreadyMirrored } = require('../src/execution/basketTradesMirror');

function setupFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-'));
  const portfolioDir = path.join(dir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n');
  return { dir, portfolioDir };
}

(async () => {
  const { dir, portfolioDir } = setupFixture();

  // Unit: legAlreadyMirrored
  assert.strictEqual(legAlreadyMirrored([], 9124), false);
  assert.strictEqual(legAlreadyMirrored([{ 'Broker order id': '9124' }], 9124), true);
  assert.strictEqual(legAlreadyMirrored([{ 'Broker order id': '9125' }], 9124), false);
  assert.strictEqual(legAlreadyMirrored([{ 'Broker order id': '' }], null), false);

  // Integration: mirror filled + cancelled
  const runState = {
    legs: {
      'leg-1': { instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8', status: 'filled', brokerOrderId: 9124, fillQuantity: 16, avgFillPrice: 691.04 },
      'leg-2': { instrument: 'LU0950668870', ibkrSymbol: 'EMUAA', status: 'filled', brokerOrderId: 9125, fillQuantity: 6, avgFillPrice: 40.74 },
      'leg-3': { instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', status: 'cancelled', brokerOrderId: 9127, cancelledReason: 'Cancelled' },
      'leg-4': { instrument: 'XXX', ibkrSymbol: 'XXX', status: 'submitted', brokerOrderId: 9999 }, // should be ignored
    },
  };
  const result = mirrorBasketRunToTrades({ portfolioDir, runState, now: new Date('2026-05-22T10:50:00Z') });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.appended, 3);
  assert.strictEqual(result.mirrored.length, 3);
  assert(result.mirrored.some((m) => m.brokerOrderId === 9124 && m.status === 'filled'), 'mirrored list missing SXR8 filled entry');
  assert(result.mirrored.some((m) => m.brokerOrderId === 9127 && m.status === 'cancelled'), 'mirrored list missing SPMCHA cancelled entry');

  const body = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
  assert(body.includes('SXR8'), 'SXR8 row not appended');
  assert(body.includes('9124'), 'broker order id 9124 missing');
  assert(body.includes('| filled |'), 'filled status row missing');
  assert(body.includes('| cancelled |'), 'cancelled status row missing');
  assert(body.includes('Re-propose with refreshed quote'), 'next action for cancelled missing');
  assert(!body.includes('| submitted |'), 'submitted leg should not have been mirrored');

  // Regression: re-running should be idempotent
  const result2 = mirrorBasketRunToTrades({ portfolioDir, runState, now: new Date('2026-05-22T10:55:00Z') });
  assert.strictEqual(result2.appended, 0, 'second run must not duplicate rows');
  assert.strictEqual(result2.skipped.length, 3, 'all rows should be skipped');
  assert.strictEqual(result2.mirrored.length, 0, 'second run must not list new mirrored entries');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
