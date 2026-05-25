#!/usr/bin/env node
'use strict';

/* Phase S5 regression: docs/operations/soak-baseline.json has the shape that
 * the soak self-check cron expects. The cron compares current state against
 * this baseline, so the contract must not drift silently.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASELINE_PATH = path.resolve(__dirname, '..', 'docs', 'operations', 'soak-baseline.json');
const READINESS_DOC = path.resolve(__dirname, '..', 'docs', 'operations', 'soak-readiness.md');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

test('soak baseline file exists', () => {
  assert(fs.existsSync(BASELINE_PATH), `expected ${BASELINE_PATH}`);
});

test('soak readiness doc exists', () => {
  assert(fs.existsSync(READINESS_DOC), `expected ${READINESS_DOC}`);
});

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

test('baseline declares schemaVersion and capturedAt', () => {
  assert(baseline.schemaVersion, 'schemaVersion required');
  assert(baseline.capturedAt, 'capturedAt required');
  assert(/^\d{4}-\d{2}-\d{2}T/.test(baseline.capturedAt), 'capturedAt must be ISO-8601');
});

test('baseline declares portfolio', () => {
  assert.strictEqual(typeof baseline.portfolio, 'string');
  assert(baseline.portfolio.length > 0);
});

test('baseline.checks has the required green-sweep entries', () => {
  const required = ['npmTest', 'healthCheck', 'interactiveBrokersReadiness', 'generatedState', 'safetyControls'];
  for (const k of required) {
    assert(baseline.checks[k], `baseline.checks.${k} required`);
    assert.strictEqual(typeof baseline.checks[k].passed, 'boolean', `baseline.checks.${k}.passed must be boolean`);
  }
});

test('baseline.checks.healthCheck declares openIssues count', () => {
  assert.strictEqual(typeof baseline.checks.healthCheck.openIssues, 'number');
});

test('baseline.cron declares enabledCount and consecutiveErrorsMax', () => {
  assert.strictEqual(typeof baseline.cron.enabledCount, 'number');
  assert.strictEqual(typeof baseline.cron.consecutiveErrorsMax, 'number');
  assert(baseline.cron.snapshot, 'cron snapshot pointer required');
});

test('baseline.circuitBreakers declares activeCount', () => {
  assert.strictEqual(typeof baseline.circuitBreakers.activeCount, 'number');
});

test('baseline declares knownIssues and operatorActionsExpected arrays', () => {
  assert(Array.isArray(baseline.knownIssues), 'knownIssues must be an array');
  assert(Array.isArray(baseline.operatorActionsExpected), 'operatorActionsExpected must be an array');
  for (const issue of baseline.knownIssues) {
    assert(issue.id, 'each knownIssue needs an id');
    assert(['low', 'medium', 'high', 'critical'].includes(issue.severity), `severity must be one of low/medium/high/critical, got ${issue.severity}`);
  }
});

test('baseline.cron.snapshot path is a string pointing at active-cron-jobs.json', () => {
  assert(baseline.cron.snapshot.endsWith('active-cron-jobs.json'));
  const resolved = path.resolve(__dirname, '..', baseline.cron.snapshot);
  assert(fs.existsSync(resolved), `cron snapshot pointer must resolve: ${resolved}`);
});

console.log(JSON.stringify({ ok: true, passed }));
