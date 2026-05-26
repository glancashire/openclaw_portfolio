'use strict';

/**
 * Subprocess tests for scripts/approve-and-execute.js.
 * Spawn the wrapper as a child process; assert exit codes, intent-file
 * existence, and (critically) that the secret never appears in captured
 * stdout/stderr.
 *
 * We always pass --dry-run so the runner is never invoked. We use --root
 * to redirect the artefact into a tmp dir per test.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, 'approve-and-execute.js');

let asserted = 0;
function ok(label, cond, extra) {
  if (!cond && extra !== undefined) console.error('extra:', JSON.stringify(extra).slice(0, 400));
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

function tempRoot() { return fs.mkdtempSync(path.join(os.tmpdir(), 'awe-')); }

function run({ args = [], env = {} } = {}) {
  const allArgs = args.includes('--dry-run') ? args : args.concat(['--dry-run']);
  return spawnSync(process.execPath, [SCRIPT, ...allArgs], {
    env: Object.assign({ PATH: process.env.PATH }, env),
    encoding: 'utf8',
  });
}

const SECRET = 'shortseller';
const PIN    = '8755';
const APPROVAL_ID = 'basket-fake-2026-05-26';

// 1. Safe-word happy path
{
  const root = tempRoot();
  const res = run({
    args: [`--approval-id=${APPROVAL_ID}`, `--secret=${SECRET}`, `--root=${root}`],
    env:  { OPENCLAW_APPROVAL_SAFEWORD: SECRET },
  });
  ok('safe-word happy path → exit 0', res.status === 0, { stderr: res.stderr });
  const intentPath = path.join(root, 'runtime/approval-intent', `${APPROVAL_ID}.json`);
  ok('safe-word happy path → intent file exists', fs.existsSync(intentPath));
  const artefact = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
  ok('safe-word happy path → artefact.safeWord set', artefact.safeWord === SECRET);
  ok('safe-word happy path → artefact.pin absent',   artefact.pin === undefined);
  ok('safe-word happy path → scope basket-execute',  artefact.scope === 'basket-execute');
  ok('safe-word happy path → matched=safeWord in stdout', /matched=safeWord/.test(res.stdout));
  ok('safe-word happy path → secret NOT in stdout',  !new RegExp(SECRET).test(res.stdout), { stdout: res.stdout });
  ok('safe-word happy path → secret NOT in stderr',  !new RegExp(SECRET).test(res.stderr), { stderr: res.stderr });
  ok('safe-word happy path → file mode 0600',        (fs.statSync(intentPath).mode & 0o777) === 0o600);
}

// 2. PIN happy path
{
  const root = tempRoot();
  const res = run({
    args: [`--approval-id=${APPROVAL_ID}`, `--secret=${PIN}`, `--root=${root}`],
    env:  { OPENCLAW_APPROVAL_PIN: PIN },
  });
  ok('PIN happy path → exit 0', res.status === 0, { stderr: res.stderr });
  const artefact = JSON.parse(fs.readFileSync(path.join(root, 'runtime/approval-intent', `${APPROVAL_ID}.json`), 'utf8'));
  ok('PIN happy path → artefact.pin set',         artefact.pin === PIN);
  ok('PIN happy path → artefact.safeWord absent', artefact.safeWord === undefined);
  ok('PIN happy path → matched=pin in stdout',    /matched=pin/.test(res.stdout));
  // The PIN '8755' must not appear outside the intent-file path
  // (we accept it appearing inside `→ /…/<approvalId>.json` text since the approvalId itself contains the year, etc.)
  // Specifically check no isolated '8755' token.
  ok('PIN happy path → "8755" token not in stdout',
     !/(?<![\w])8755(?![\w])/.test(res.stdout), { stdout: res.stdout });
}

// 3. Secret mismatch
{
  const root = tempRoot();
  const res = run({
    args: [`--approval-id=${APPROVAL_ID}`, '--secret=wrongword', `--root=${root}`],
    env:  { OPENCLAW_APPROVAL_SAFEWORD: SECRET, OPENCLAW_APPROVAL_PIN: PIN },
  });
  ok('secret_mismatch → exit 2',                   res.status === 2);
  ok('secret_mismatch → reason in stderr',         /secret_mismatch/.test(res.stderr));
  ok('secret_mismatch → no intent file written',   !fs.existsSync(path.join(root, 'runtime/approval-intent', `${APPROVAL_ID}.json`)));
  ok('secret_mismatch → configured safe-word NOT in stderr', !new RegExp(SECRET).test(res.stderr));
  ok('secret_mismatch → wrong word NOT in stderr', !/wrongword/.test(res.stderr));
}

// 4. Missing --approval-id
{
  const res = run({ args: ['--secret=x'], env: { OPENCLAW_APPROVAL_SAFEWORD: SECRET } });
  ok('missing --approval-id → exit 1',  res.status === 1);
  ok('missing --approval-id → message', /approval-id is required/.test(res.stderr));
}

// 5. Missing --secret
{
  const res = run({ args: ['--approval-id=foo'], env: { OPENCLAW_APPROVAL_SAFEWORD: SECRET } });
  ok('missing --secret → exit 1',  res.status === 1);
  ok('missing --secret → message', /secret is required/.test(res.stderr));
}

// 6. Gate unconfigured
{
  const root = tempRoot();
  const res = run({
    args: [`--approval-id=${APPROVAL_ID}`, `--secret=${SECRET}`, `--root=${root}`],
    env: {},
  });
  ok('gate unconfigured → exit 2',  res.status === 2);
  ok('gate unconfigured → message', /gate not configured/.test(res.stderr));
}

// 7. --dry-run path explicit
{
  const root = tempRoot();
  const res = run({
    args: [`--approval-id=${APPROVAL_ID}`, `--secret=${SECRET}`, `--root=${root}`, '--dry-run'],
    env:  { OPENCLAW_APPROVAL_SAFEWORD: SECRET },
  });
  ok('--dry-run → exit 0',                res.status === 0);
  ok('--dry-run → "not invoking runner"', /not invoking runner/.test(res.stdout));
}

console.log(JSON.stringify({ ok: true, asserted }));
