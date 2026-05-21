const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { saveApprovalEnvelope, loadApprovalEnvelope, listApprovalEnvelopes, validateApprovalEnvelope } = require('../src/execution/basketApprovalStore');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'basket-approval-'));
const approval = {
  approvalId: 'basket-001',
  portfolio: 'etf',
  createdAt: '2026-05-21T22:00:00Z',
  expiresAt: '2099-05-21T22:00:00Z',
  summary: 'Deploy new cash in one approved basket',
  executionPolicy: { continueOnIndependentFailure: true, requireCompactReapprovalOnPriceDrift: true, substitutionAllowed: false },
  legs: [
    { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8', conid: '75776072', action: 'BUY', quantity: 2, limitPrice: 689.2, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 2, retryPolicy: 'one_retry' },
    { legId: 'leg-2', instrument: 'LU0950668870', ibkrSymbol: 'EMUAA', conid: '243939970', action: 'BUY', quantity: 14, limitPrice: 40.9, currency: 'EUR', exchange: 'SMART', primaryExchange: 'XETRA', maxAttempts: 1, retryPolicy: 'none' },
  ],
};

const validation = validateApprovalEnvelope(approval);
assert.strictEqual(validation.ok, true);
assert.strictEqual(validation.envelope.legs[0].action, 'BUY');
assert.strictEqual(validation.envelope.legs[1].exchange, 'SMART');

const saved = saveApprovalEnvelope(approval, { rootDir: dir });
assert(fs.existsSync(saved.path));
const loaded = loadApprovalEnvelope({ portfolio: 'etf', approvalId: 'basket-001', rootDir: dir });
assert.strictEqual(loaded.envelope.approvalId, 'basket-001');
assert.strictEqual(loaded.envelope.legs.length, 2);

const listed = listApprovalEnvelopes({ portfolio: 'etf', rootDir: dir });
assert.strictEqual(listed.length, 1);
assert.strictEqual(listed[0].approvalId, 'basket-001');

const expired = validateApprovalEnvelope({ ...approval, approvalId: 'expired', expiresAt: '2020-01-01T00:00:00Z' });
assert.strictEqual(expired.ok, false);
assert(expired.errors.some((err) => String(err).includes('expired')));

let threw = false;
try {
  saveApprovalEnvelope({ approvalId: 'bad', portfolio: 'etf', expiresAt: '2099-01-01T00:00:00Z', legs: [{ legId: 'leg-1', instrument: '', action: 'BUY', quantity: 0, limitPrice: 0, currency: 'EUR' }] }, { rootDir: dir });
} catch (error) {
  threw = true;
  assert(error.validationErrors.length > 0);
}
assert.strictEqual(threw, true);
console.log(JSON.stringify({ ok: true }, null, 2));
