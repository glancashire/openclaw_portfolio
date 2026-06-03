#!/usr/bin/env node
'use strict';

/**
 * Regression: dashboard digest KPI card.
 *
 * - When usage-counters.json exists, the digest HTML includes the Operations KPI card.
 * - When usage-counters.json does NOT exist, the digest renders cleanly without it.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { buildDashboardDigest } = require('../src/reporting/dashboardDigest');
const { writeSnapshot, COUNTERS_PATH } = require('../src/reporting/usageCounters');

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const portfolioDir = path.join(repoRoot, 'portfolio/etf');

  // Ensure counters file exists (regenerate from real evidence).
  const { buildSnapshot } = require('../src/reporting/usageCounters');
  const snapshot = buildSnapshot(repoRoot);
  writeSnapshot(snapshot);

  // Noop model client
  const noopModelClient = { complete: async () => ({ content: [{ text: '' }] }) };

  // Build digest WITH counters
  const digest = await buildDashboardDigest({
    portfolioDir,
    frequency: 'daily',
    generatedAt: new Date().toISOString(),
    modelClient: noopModelClient,
  });

  assert(digest.html.includes('Operations KPI'), 'KPI card renders when counters are present');
  assert(digest.html.includes('Reports sent'), 'KPI card contains report-send metric');

  // Now remove counters file temporarily and verify clean rendering
  const backupPath = COUNTERS_PATH + '.bak';
  if (fs.existsSync(COUNTERS_PATH)) {
    fs.renameSync(COUNTERS_PATH, backupPath);
  }
  try {
    const digestNoKpi = await buildDashboardDigest({
      portfolioDir,
      frequency: 'daily',
      generatedAt: new Date().toISOString(),
      modelClient: noopModelClient,
    });
    assert(!digestNoKpi.html.includes('Operations KPI'), 'KPI card absent when no counters file');
    // No undefined in output
    assert(!digestNoKpi.html.includes('undefined'), 'no undefined in digest without counters');
  } finally {
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, COUNTERS_PATH);
    }
  }

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
