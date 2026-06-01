'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { fetchCronJobs, fetchCronHealth, clearCronCache } = require('../src/reporting/cronJobsFetcher');
const { summarizeCronJobs } = require('../src/reporting/cronHealthCard');

function withStub(scriptBody, fn) {
  const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cron-status-stub-'));
  const stubPath = path.join(stubDir, 'openclaw');
  fs.writeFileSync(stubPath, `#!/bin/sh\n${scriptBody}\n`);
  fs.chmodSync(stubPath, 0o755);
  const prevPath = process.env.PATH || '';
  process.env.PATH = `${stubDir}:${prevPath}`;
  clearCronCache();
  try {
    return fn();
  } finally {
    process.env.PATH = prevPath;
    clearCronCache();
  }
}

(async () => {
  await withStub("echo '{\"jobs\":[{\"id\":\"ok\",\"name\":\"daily-sync\",\"state\":{\"consecutiveErrors\":0}}]}'", () => {
    const result = fetchCronJobs();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(Array.isArray(result.jobs), true);
    assert.strictEqual(result.jobs.length, 1);
    const health = fetchCronHealth();
    assert.strictEqual(health.status, 'ok');
    assert.strictEqual(health.total, 1);
  });

  await withStub("echo 'not-json'", () => {
    const result = fetchCronJobs();
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 'unavailable');
    assert.strictEqual(result.reason, 'invalid_json');
    assert.strictEqual(result.jobs.length, 0);
    const health = fetchCronHealth();
    assert.strictEqual(health.status, 'unavailable');
    assert.strictEqual(health.total, 0);
    assert.strictEqual(health.message, 'Cron inspection unavailable.');
  });

  await withStub("exit 1", () => {
    const result = fetchCronJobs();
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 'unavailable');
    assert.strictEqual(result.reason, 'command_failed');
    const health = fetchCronHealth();
    assert.strictEqual(health.status, 'unavailable');
    assert.strictEqual(health.message, 'Cron inspection unavailable.');
  });

  const empty = summarizeCronJobs([], { sourceStatus: 'ok' });
  assert.strictEqual(empty.status, 'empty');
  assert.strictEqual(empty.message, 'No enabled cron jobs found.');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
