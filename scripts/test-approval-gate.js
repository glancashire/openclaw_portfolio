'use strict';

/**
 * Unit tests for src/execution/approvalGate.js.
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
}

function baseEnv(extra = {}) {
  return Object.assign({
    OPENCLAW_APPROVAL_SAFEWORD: 'shortseller',
    OPENCLAW_APPROVAL_PIN:      '8755',
  }, extra);
}

function silentLogger() { return () => {}; }

function expectDenied(fn, expectedReason) {
  let threw = null;
  try { fn(); } catch (e) { threw = e; }
  if (!threw) throw new Error(`expected ApprovalGateError(${expectedReason}); got pass`);
  if (threw.code !== 'APPROVAL_GATE_DENIED') throw new Error(`expected code APPROVAL_GATE_DENIED; got ${threw.code} (${threw.message})`);
  if (threw.reason !== expectedReason) throw new Error(`expected reason ${expectedReason}; got ${threw.reason} (${threw.message})`);
}

const commonArgs = {
  approvalId: 'basket-etf-test-1',
  scriptName: 'test-runner',
  scope:      'basket-execute',
  logger:     silentLogger(),
};

// 1. no intent
{
  const root = freshRoot();
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() }), 'no_intent');
  ok('no intent artefact → no_intent', true);
}

// 2. id mismatch
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: 'other-id', rootDir: root, scope: 'basket-execute', safeWord: 'shortseller' });
  // Place that artefact at the path expected for 'basket-etf-test-1' to force the mismatch.
  fs.renameSync(_intentPath(root, 'other-id'), _intentPath(root, 'basket-etf-test-1'));
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() }), 'id_mismatch');
  ok('artefact approvalId mismatch → id_mismatch', true);
}

// 3. scope mismatch
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'trades-execute', safeWord: 'shortseller' });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() }), 'scope_mismatch');
  ok('scope mismatch → scope_mismatch', true);
}

// 4. stale (45 min ago)
{
  const root = freshRoot();
  const old = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller', issuedAt: old });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() }), 'stale');
  ok('artefact older than maxAgeMinutes → stale', true);
}

// 5. missing safeword + pin
{
  const root = freshRoot();
  const p = _intentPath(root, commonArgs.approvalId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ approvalId: commonArgs.approvalId, scope: 'basket-execute', issuedAt: new Date().toISOString() }));
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() }), 'safeword_missing');
  ok('artefact has neither safeWord nor pin → safeword_missing', true);
}

// 6. wrong safeword
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'wrongword' });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() }), 'safeword_mismatch');
  ok('wrong safeWord → safeword_mismatch', true);
}

// 7. correct safeword only → pass
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller' });
  const r = requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() });
  ok('correct safeWord only → passes', r && r.bypassed === false);
}

// 8. correct PIN only → pass (env has no safeword)
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', pin: '8755' });
  const r = requireApprovalIntent({ ...commonArgs, rootDir: root, env: { OPENCLAW_APPROVAL_PIN: '8755' } });
  ok('correct PIN only with PIN-only env → passes', r && r.bypassed === false);
}

// 9. both correct → pass
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller', pin: '8755' });
  const r = requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() });
  ok('both safeWord and PIN correct → passes', r && r.bypassed === false);
}

// 10. gate unconfigured (no env)
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller' });
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: {} }), 'gate_unconfigured');
  ok('no env vars set → gate_unconfigured', true);
}

// 11. bypass with live order → refused
{
  const root = freshRoot();
  expectDenied(
    () => requireApprovalIntent({ ...commonArgs, rootDir: root, env: { OPENCLAW_SKIP_APPROVAL_GATE: '1', OPENCLAW_PLACE_LIVE_ORDER: '1' } }),
    'bypass_refused_live',
  );
  ok('bypass + live-order → bypass_refused_live', true);
}

// 12. bypass alone → pass, warning logged
{
  const root = freshRoot();
  let warning = null;
  const r = requireApprovalIntent({
    ...commonArgs,
    rootDir: root,
    env: { OPENCLAW_SKIP_APPROVAL_GATE: '1' },
    logger: (msg) => { warning = msg; },
  });
  ok('bypass alone → returns bypassed=true', r && r.bypassed === true);
  ok('bypass alone → warning logged', typeof warning === 'string' && /bypassed/.test(warning));
}

// 13. error messages NEVER include the safe-word or PIN
{
  const root = freshRoot();
  writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'wrongword' });
  let threw = null;
  try { requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() }); } catch (e) { threw = e; }
  ok('error message does not leak configured safe-word', threw && !/shortseller/.test(threw.message));
  ok('error message does not leak configured PIN',       threw && !/8755/.test(threw.message));
  ok('error message does not leak intent safe-word',     threw && !/wrongword/.test(threw.message));
}

// 14. writeApprovalIntent locks down perms
{
  const root = freshRoot();
  const p = writeApprovalIntent({ approvalId: commonArgs.approvalId, rootDir: root, scope: 'basket-execute', safeWord: 'shortseller' });
  const stat = fs.statSync(p);
  ok('artefact written with 0600 perms', (stat.mode & 0o777) === 0o600);
}

// 15. malformed JSON → no_intent
{
  const root = freshRoot();
  const p = _intentPath(root, commonArgs.approvalId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, '{not json}');
  expectDenied(() => requireApprovalIntent({ ...commonArgs, rootDir: root, env: baseEnv() }), 'no_intent');
  ok('malformed JSON intent → no_intent', true);
}

console.log(JSON.stringify({ ok: true, asserted }));
