#!/usr/bin/env node
'use strict';

/* Phase W4: regression test for artifact hash-gate (writeTextIfChanged / writeJsonIfChanged).
 *
 * Verifies that:
 * 1. Writing identical content does not touch the file (mtime unchanged).
 * 2. Writing different content does touch the file.
 * 3. The hash-gated writers are used in the noisy overview generators.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { writeTextIfChanged, writeJsonIfChanged } = require('../src/reporting/artifactWriter');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hash-gate-test-'));
const cleanup = () => { try { fs.rmSync(TMP, { recursive: true }); } catch (_) {} };
process.on('exit', cleanup);

test('writeTextIfChanged: first write creates file', () => {
  const p = path.join(TMP, 'a.txt');
  const r = writeTextIfChanged(p, 'hello\n');
  assert.strictEqual(r.wrote, true);
  assert.strictEqual(r.changed, true);
  assert.strictEqual(fs.readFileSync(p, 'utf8'), 'hello\n');
});

test('writeTextIfChanged: same content skips write', () => {
  const p = path.join(TMP, 'a.txt');
  const r = writeTextIfChanged(p, 'hello\n');
  assert.strictEqual(r.wrote, false);
  assert.strictEqual(r.changed, false);
});

test('writeTextIfChanged: different content writes', () => {
  const p = path.join(TMP, 'a.txt');
  const r = writeTextIfChanged(p, 'world\n');
  assert.strictEqual(r.wrote, true);
  assert.strictEqual(r.changed, true);
  assert.strictEqual(fs.readFileSync(p, 'utf8'), 'world\n');
});

test('writeJsonIfChanged: first write creates file', () => {
  const p = path.join(TMP, 'b.json');
  const r = writeJsonIfChanged(p, { key: 'value' });
  assert.strictEqual(r.wrote, true);
  assert.strictEqual(fs.existsSync(p), true);
});

test('writeJsonIfChanged: same object skips write', () => {
  const p = path.join(TMP, 'b.json');
  const r = writeJsonIfChanged(p, { key: 'value' });
  assert.strictEqual(r.wrote, false);
});

test('writeJsonIfChanged: different object writes', () => {
  const p = path.join(TMP, 'b.json');
  const r = writeJsonIfChanged(p, { key: 'other' });
  assert.strictEqual(r.wrote, true);
});

test('summaryArtifacts.js uses writeJsonIfChanged (not raw writeFileSync) for overview writes', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'reporting', 'summaryArtifacts.js'), 'utf8');
  // Should not have raw fs.writeFileSync in the overview generation section
  const rawWrites = (src.match(/fs\.writeFileSync/g) || []).length;
  assert.strictEqual(rawWrites, 0, `expected 0 raw fs.writeFileSync calls in summaryArtifacts.js, found ${rawWrites}`);
});

test('healthReport.js uses writeJsonIfChanged (not raw writeFileSync)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'reporting', 'healthReport.js'), 'utf8');
  const rawWrites = (src.match(/fs\.writeFileSync/g) || []).length;
  assert.strictEqual(rawWrites, 0, `expected 0 raw fs.writeFileSync calls in healthReport.js, found ${rawWrites}`);
});

console.log(JSON.stringify({ ok: true, passed }));
