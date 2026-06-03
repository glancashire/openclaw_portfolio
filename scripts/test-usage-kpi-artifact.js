#!/usr/bin/env node
'use strict';

/**
 * Integration test for the usage-kpi artifact triplet (JSON, MD, HTML).
 *
 * Uses a synthetic fixture to verify the generator produces all three
 * files with the expected content structure.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { generateUsageKpiArtifacts, ARTIFACT_PREFIX } = require('../src/reporting/usageKpiArtifact');
const { writeSnapshot } = require('../src/reporting/usageCounters');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

test('generateUsageKpiArtifacts: returns ok=false when no counters', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kpi-test-'));
  const r = generateUsageKpiArtifacts(tmp);
  assert.strictEqual(r.ok, false);
  fs.rmSync(tmp, { recursive: true });
});

test('generateUsageKpiArtifacts: produces triplet from valid counters', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kpi-test-'));
  const overviewDir = path.join(tmp, 'runtime/overview');
  fs.mkdirSync(overviewDir, { recursive: true });
  const fixture = {
    schemaVersion: '1.0',
    generatedAt: '2026-06-03T00:00:00Z',
    counters: {
      reportSends: { last7d: 5, last30d: 12 },
      deliveryHealth: { available: true, readyPortfolios: 2, notReadyPortfolios: 0, brokerDegraded: false },
      approvalLatency: { available: true, pendingCount: 1, resolvedCount: 3, medianMs: 60000, p90Ms: 120000 },
      reconciliationLag: { available: true, lagDays: 0.3, lastReconcileAt: '2026-06-03T00:00:00Z' },
    },
  };
  writeSnapshot(fixture, path.join(overviewDir, 'usage-counters.json'));
  const r = generateUsageKpiArtifacts(tmp);
  assert.strictEqual(r.ok, true);
  assert(r.items >= 3, `expected >=3 items, got ${r.items}`);

  // Verify JSON
  const jsonPath = path.join(overviewDir, `${ARTIFACT_PREFIX}.json`);
  assert(fs.existsSync(jsonPath));
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(jsonData.schemaVersion, '1.0');
  assert(jsonData.items.length >= 3);

  // Verify MD
  const mdPath = path.join(overviewDir, `${ARTIFACT_PREFIX}.md`);
  assert(fs.existsSync(mdPath));
  const mdText = fs.readFileSync(mdPath, 'utf8');
  assert(mdText.includes('Operations KPI'));
  assert(mdText.includes('Reports sent'));

  // Verify HTML
  const htmlPath = path.join(overviewDir, `${ARTIFACT_PREFIX}.html`);
  assert(fs.existsSync(htmlPath));
  const htmlText = fs.readFileSync(htmlPath, 'utf8');
  assert(htmlText.includes('<!DOCTYPE html>'));
  assert(htmlText.includes('Usage KPI'));
  assert(htmlText.includes('prefers-color-scheme'));

  fs.rmSync(tmp, { recursive: true });
});

console.log(JSON.stringify({ ok: true, passed }, null, 2));
