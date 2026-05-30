'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseDotEnv, readWorkspaceEnv, applyEnvValues, loadWorkspaceEnv } = require('../src/shared/env');

const parsed = parseDotEnv(`\n# comment\nFOO=bar\nQUOTED="hello world"\nSINGLE='yep'\nEMPTY=\nINVALID\n`);
assert.deepStrictEqual(parsed, {
  FOO: 'bar',
  QUOTED: 'hello world',
  SINGLE: 'yep',
  EMPTY: '',
});

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-env-'));
const envPath = path.join(tempDir, '.env');
fs.writeFileSync(envPath, 'A=1\nB=two\n');

const before = process.env.A;
delete process.env.A;
delete process.env.B;

const readOnly = readWorkspaceEnv(envPath);
assert.strictEqual(readOnly.loaded, true);
assert.deepStrictEqual(readOnly.values, { A: '1', B: 'two' });
assert.strictEqual(process.env.A, undefined, 'readWorkspaceEnv must not mutate process.env');

const target = { A: '', C: 'keep' };
const applied = applyEnvValues(readOnly.values, target);
assert.deepStrictEqual(applied, { A: '1', B: 'two' });
assert.deepStrictEqual(target, { A: '1', B: 'two', C: 'keep' });

const loaded = loadWorkspaceEnv(envPath);
assert.strictEqual(loaded.loaded, true);
assert.strictEqual(process.env.A, '1');
assert.strictEqual(process.env.B, 'two');

if (before === undefined) delete process.env.A;
else process.env.A = before;
delete process.env.B;
fs.rmSync(tempDir, { recursive: true, force: true });

console.log(JSON.stringify({ ok: true }, null, 2));
