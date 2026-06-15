'use strict';

/* Unit tests for lib/loadEnvFile.js — pure, no network. Safe lane. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const loadEnvFile = require('../lib/loadEnvFile');
const { parseEnv } = require('../lib/loadEnvFile');

(async () => {
  // --- parseEnv: basic + quotes + comments + export prefix ---
  const parsed = parseEnv([
    '# a comment',
    '',
    'PLAIN=value1',
    'QUOTED_D="dquoted"',
    "QUOTED_S='squoted'",
    'export EXPORTED=exp',
    '  SPACED  =  trimmed  ',
    'WITH_EQ=a=b=c',
    'no_equals_line',
    'lowerbad=skipped-no... wait valid key',
    '123BAD=nope',
  ].join('\n'));
  assert.strictEqual(parsed.PLAIN, 'value1');
  assert.strictEqual(parsed.QUOTED_D, 'dquoted', 'strips double quotes');
  assert.strictEqual(parsed.QUOTED_S, 'squoted', 'strips single quotes');
  assert.strictEqual(parsed.EXPORTED, 'exp', 'handles export prefix');
  assert.strictEqual(parsed.SPACED, 'trimmed', 'trims key and value');
  assert.strictEqual(parsed.WITH_EQ, 'a=b=c', 'keeps = in value');
  assert.ok(!('no_equals_line' in parsed), 'skips lines without =');
  assert.ok(!('123BAD' in parsed), 'skips invalid key names');
  assert.strictEqual(parsed.lowerbad, 'skipped-no... wait valid key', 'lowercase keys are valid');

  // --- loadEnvFile: applies to a target env, non-destructive ---
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'loadenv-'));
  const envPath = path.join(tmp, '.env');
  fs.writeFileSync(envPath, [
    'SENTRY_AUTH_TOKEN=tok123',
    'SENTRY_ORG_SLUG=myorg',
    'ALREADY_SET=fromfile',
  ].join('\n'));

  const target = { ALREADY_SET: 'fromenv' };
  const applied = loadEnvFile({ path: envPath, env: target });
  assert.strictEqual(applied, 2, 'applies only the 2 not-already-set keys');
  assert.strictEqual(target.SENTRY_AUTH_TOKEN, 'tok123');
  assert.strictEqual(target.SENTRY_ORG_SLUG, 'myorg');
  assert.strictEqual(target.ALREADY_SET, 'fromenv', 'real env wins over file');

  // --- override=true forces overwrite ---
  const target2 = { ALREADY_SET: 'fromenv' };
  const applied2 = loadEnvFile({ path: envPath, env: target2, override: true });
  assert.strictEqual(applied2, 3);
  assert.strictEqual(target2.ALREADY_SET, 'fromfile', 'override replaces');

  // --- missing file is a silent no-op (returns 0, no throw) ---
  const applied3 = loadEnvFile({ path: path.join(tmp, 'does-not-exist.env'), env: {} });
  assert.strictEqual(applied3, 0, 'missing file → 0, no throw');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('test-load-env-file: all assertions passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
