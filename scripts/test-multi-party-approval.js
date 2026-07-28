'use strict';

/**
 * Unit tests for L2.C multi-party approval (co-sign) in
 * src/execution/approvalGate.js.
 *
 * Large baskets (CHF notional >= threshold) require a second-party
 * attestation from a channel distinct from the primary approval, with its
 * own configured safe-word/PIN. Small baskets are unaffected.
 *
 * No filesystem outside tmpdir; no live env mutated.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { requireApprovalIntent, writeApprovalIntent, _intentPath } =
  require('../src/execution/approvalGate');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

function freshRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gate2-'));
}

// Primary + second-party credentials configured, threshold at CHF 25k.
function baseEnv(extra = {}) {
  return Object.assign({
    OPENCLAW_APPROVAL_SAFEWORD:        'shortseller',
    OPENCLAW_APPROVAL_PIN:             '8755',
    OPENCLAW_APPROVAL_SECOND_SAFEWORD: 'copilot',
    OPENCLAW_APPROVAL_SECOND_PIN:      '4021',
    OPENCLAW_MULTI_PARTY_THRESHOLD_CHF: '25000',
  }, extra);
}

const commonArgs = {
  approvalId: 'basket-etf-l2c-1',
  scriptName: 'test-runner',
  scope:      'basket-execute',
  logger:     () => {},
};

function expectDenied(fn, expectedReason) {
  let threw = null;
  try { fn(); } catch (e) { threw = e; }
  if (!threw) throw new Error(`expected ApprovalGateError(${expectedReason}); got pass`);
  if (threw.code !== 'APPROVAL_GATE_DENIED') throw new Error(`expected code APPROVAL_GATE_DENIED; got ${threw.code} (${threw.message})`);
  if (threw.reason !== expectedReason) throw new Error(`expected reason ${expectedReason}; got ${threw.reason} (${threw.message})`);
}

// 1. below threshold → single approval passes, multiParty.required=false
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller', channel: 'telegram' });
  const r = requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 10000 });
  ok('below threshold → passes with single approval', r && r.bypassed === false);
  ok('below threshold → multiParty.required=false', r.multiParty && r.multiParty.required === false);
}

// 2. no notional supplied → back-compat, no co-sign enforced
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller', channel: 'telegram' });
  const r = requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() });
  ok('no notional → passes (back-compat)', r && r.bypassed === false);
  ok('no notional → multiParty null', r.multiParty === null);
}

// 3. at/above threshold, no secondParty in intent → cosign_missing
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller', channel: 'telegram' });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 30000 }), 'cosign_missing');
  ok('large basket, no second party → cosign_missing', true);
}

// 4. above threshold but second-approver env unset → cosign_unconfigured
{
  const root = freshRoot();
  writeApprovalIntent({
    approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute',
    safeWord: 'shortseller', channel: 'telegram',
    secondParty: { safeWord: 'copilot', channel: 'email' },
  });
  const env = baseEnv();
  delete env.OPENCLAW_APPROVAL_SECOND_SAFEWORD;
  delete env.OPENCLAW_APPROVAL_SECOND_PIN;
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env, notionalChf: 30000 }), 'cosign_unconfigured');
  ok('second-approver env unset → cosign_unconfigured', true);
}

// 5. second-party wrong safe-word → cosign_mismatch
{
  const root = freshRoot();
  writeApprovalIntent({
    approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute',
    safeWord: 'shortseller', channel: 'telegram',
    secondParty: { safeWord: 'wrongco', channel: 'email' },
  });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 30000 }), 'cosign_mismatch');
  ok('second party wrong safe-word → cosign_mismatch', true);
}

// 6. second-party same channel as primary → cosign_same_channel
{
  const root = freshRoot();
  writeApprovalIntent({
    approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute',
    safeWord: 'shortseller', channel: 'telegram',
    secondParty: { safeWord: 'copilot', channel: 'telegram' },
  });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 30000 }), 'cosign_same_channel');
  ok('second party same channel → cosign_same_channel', true);
}

// 7. second-party missing channel → cosign_channel_missing
{
  const root = freshRoot();
  writeApprovalIntent({
    approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute',
    safeWord: 'shortseller', channel: 'telegram',
    secondParty: { safeWord: 'copilot' },
  });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 30000 }), 'cosign_channel_missing');
  ok('second party no channel → cosign_channel_missing', true);
}

// 8. stale second-party co-sign → cosign_stale
{
  const root = freshRoot();
  const old = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  writeApprovalIntent({
    approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute',
    safeWord: 'shortseller', channel: 'telegram',
    secondParty: { safeWord: 'copilot', channel: 'email', issuedAt: old },
  });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 30000 }), 'cosign_stale');
  ok('stale second-party co-sign → cosign_stale', true);
}

// 9. valid co-sign from distinct channel → passes
{
  const root = freshRoot();
  writeApprovalIntent({
    approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute',
    safeWord: 'shortseller', channel: 'telegram',
    secondParty: { safeWord: 'copilot', channel: 'email' },
  });
  const r = requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 30000 });
  ok('valid distinct-channel co-sign → passes', r && r.bypassed === false);
  ok('valid co-sign → multiParty.required=true', r.multiParty && r.multiParty.required === true);
  ok('valid co-sign → records second channel', r.multiParty.secondChannel === 'email');
}

// 10. co-sign by PIN (second) → passes
{
  const root = freshRoot();
  writeApprovalIntent({
    approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute',
    pin: '8755', channel: 'telegram',
    secondParty: { pin: '4021', channel: 'signal' },
  });
  const r = requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 50000 });
  ok('co-sign by PIN from distinct channel → passes', r && r.multiParty.required === true);
}

// 11. exactly at threshold → co-sign enforced (>=)
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller', channel: 'telegram' });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 25000 }), 'cosign_missing');
  ok('exactly at threshold → co-sign enforced', true);
}

// 12. error messages never leak configured second credential
{
  const root = freshRoot();
  writeApprovalIntent({
    approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute',
    safeWord: 'shortseller', channel: 'telegram',
    secondParty: { safeWord: 'wrongco', channel: 'email' },
  });
  let threw = null;
  try { requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv(), notionalChf: 30000 }); } catch (e) { threw = e; }
  ok('error does not leak configured second safe-word', threw && !/copilot/.test(threw.message));
  ok('error does not leak configured second PIN',        threw && !/4021/.test(threw.message));
}

console.log(JSON.stringify({ ok: true, asserted }));
