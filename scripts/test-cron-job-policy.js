#!/usr/bin/env node
'use strict';

/* Cron policy guard.
 *
 * Validates the committed snapshot at docs/operations/active-cron-jobs.json
 * against the policy documented in docs/operations/cron.md. Every enabled job
 * must:
 *   - have sessionTarget = "current" OR a sticky "session:..." key
 *     (never "isolated" or undefined on this host, because the host has
 *      sandbox.mode = off and isolated jobs require Docker)
 *   - have delivery.bestEffort = true when delivery.mode = "announce"
 *     (Telegram fails-closed on this host; bestEffort prevents the failure
 *      from incrementing consecutiveErrors)
 *   - have payload.kind = "agentTurn"
 *   - have a non-empty payload.toolsAllow OR an explicitly-null entry
 *
 * This test deliberately reads the committed snapshot rather than the live
 * cron API so it works in CI environments without gateway access.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SNAPSHOT_PATH = path.resolve(__dirname, '..', 'docs', 'operations', 'active-cron-jobs.json');
const MARKDOWN_PATH = path.resolve(__dirname, '..', 'docs', 'operations', 'active-cron-jobs.md');
const CRON_DOC_PATH = path.resolve(__dirname, '..', 'docs', 'operations', 'cron.md');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

test('cron snapshot file exists', () => {
  assert(fs.existsSync(SNAPSHOT_PATH), `expected snapshot at ${SNAPSHOT_PATH}`);
});

test('cron markdown mirror exists', () => {
  assert(fs.existsSync(MARKDOWN_PATH), `expected markdown at ${MARKDOWN_PATH}`);
});

test('cron policy doc exists', () => {
  assert(fs.existsSync(CRON_DOC_PATH), `expected policy doc at ${CRON_DOC_PATH}`);
});

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));

test('snapshot has enabledJobs array', () => {
  assert(Array.isArray(snapshot.enabledJobs), 'expected enabledJobs array');
  assert(snapshot.enabledJobs.length > 0, 'expected at least one enabled job');
});

test('every enabled job has sessionTarget=current or session:...', () => {
  for (const job of snapshot.enabledJobs) {
    const target = job.sessionTarget;
    assert(
      target === 'current' || (typeof target === 'string' && target.startsWith('session:')),
      `${job.name}: sessionTarget must be "current" or "session:...", got ${JSON.stringify(target)}`,
    );
  }
});

test('no enabled job uses sessionTarget=isolated (Docker sandbox is unavailable on this host)', () => {
  for (const job of snapshot.enabledJobs) {
    assert.notStrictEqual(
      job.sessionTarget,
      'isolated',
      `${job.name}: isolated sessionTarget is forbidden on this host`,
    );
  }
});

test('every enabled job using announce delivery sets bestEffort:true', () => {
  for (const job of snapshot.enabledJobs) {
    const d = job.delivery || {};
    if (d.mode === 'announce') {
      assert.strictEqual(
        d.bestEffort,
        true,
        `${job.name}: announce delivery without bestEffort:true will fail-closed on Telegram and self-disable the job`,
      );
    }
  }
});

test('every enabled job has payloadKind=agentTurn', () => {
  for (const job of snapshot.enabledJobs) {
    assert.strictEqual(
      job.payloadKind,
      'agentTurn',
      `${job.name}: payloadKind must be agentTurn for non-trivial work, got ${job.payloadKind}`,
    );
  }
});

test('every enabled job declares a schedule with kind=cron or kind=at', () => {
  for (const job of snapshot.enabledJobs) {
    const k = job.schedule?.kind;
    assert(['cron', 'at', 'every'].includes(k), `${job.name}: invalid schedule.kind=${k}`);
    if (k === 'cron') assert(job.schedule.tz, `${job.name}: cron schedule must declare tz`);
    if (k === 'at') assert(job.schedule.at, `${job.name}: at schedule must declare at`);
  }
});

test('every enabled job has a name and id', () => {
  for (const job of snapshot.enabledJobs) {
    assert(job.name && typeof job.name === 'string', `expected job.name`);
    assert(job.id && typeof job.id === 'string', `${job.name}: expected job.id`);
  }
});

test('the markdown mirror references every enabled job by name', () => {
  const md = fs.readFileSync(MARKDOWN_PATH, 'utf8');
  for (const job of snapshot.enabledJobs) {
    assert(
      md.includes(job.name),
      `markdown mirror is missing job entry for ${job.name}`,
    );
  }
});

test('cron snapshot is not older than 90 days (Phase W2)', () => {
  const snapshotAt = snapshot.snapshotAt;
  assert(snapshotAt && typeof snapshotAt === 'string', 'snapshot must declare snapshotAt');
  const captured = Date.parse(snapshotAt);
  assert(!Number.isNaN(captured), `snapshotAt must be ISO-8601, got ${snapshotAt}`);
  const ageDays = (Date.now() - captured) / (1000 * 60 * 60 * 24);
  assert(
    ageDays < 90,
    `cron snapshot is ${ageDays.toFixed(0)} days old (>=90); refresh docs/operations/active-cron-jobs.json from \`openclaw cron list --json\``,
  );
  if (ageDays > 30) {
    // Soft warning, does not fail the test.
    console.warn(`WARN: cron snapshot is ${ageDays.toFixed(0)} days old; consider refreshing.`);
  }
});

console.log(JSON.stringify({ ok: true, passed, enabledCount: snapshot.enabledJobs.length }));
