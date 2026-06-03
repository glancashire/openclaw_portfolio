'use strict';

/**
 * Generate the usage-kpi artifact triplet (JSON, MD, HTML) from the
 * counters snapshot at runtime/overview/usage-counters.json.
 *
 * usage:
 *   const { generateUsageKpiArtifacts } = require('./usageKpiArtifact');
 *   generateUsageKpiArtifacts(repoRoot);
 */

const fs = require('fs');
const path = require('path');
const { readSnapshot, summarizeForDashboard } = require('./usageCounters');
const { page, card, metricGrid, escapeHtml } = require('./emailHtml');

const ARTIFACT_PREFIX = 'usage-kpi';

function generateUsageKpiArtifacts(repoRoot) {
  const countersPath = path.join(repoRoot, 'runtime/overview/usage-counters.json');
  const snapshot = readSnapshot(countersPath);
  if (!snapshot) {
    return { ok: false, reason: 'No counters snapshot found' };
  }

  const items = summarizeForDashboard(snapshot);
  const outDir = path.join(repoRoot, 'runtime/overview');
  fs.mkdirSync(outDir, { recursive: true });

  // JSON
  const jsonOut = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    source: 'usage-counters.json',
    items,
  };
  const jsonPath = path.join(outDir, `${ARTIFACT_PREFIX}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2));

  // Markdown
  const mdLines = [
    '# Operations KPI',
    '',
    `Generated: ${jsonOut.generatedAt}`,
    '',
    '| Metric | Value | Detail |',
    '|---|---|---|',
    ...items.map(i => `| ${i.label} | ${i.value} | ${i.detail || '—'} |`),
    '',
  ];
  const mdPath = path.join(outDir, `${ARTIFACT_PREFIX}.md`);
  fs.writeFileSync(mdPath, mdLines.join('\n'));

  // HTML
  const gridHtml = metricGrid(items);
  const htmlOut = page({
    eyebrow: 'Operations',
    title: 'Usage KPI',
    subtitle: `Snapshot: ${jsonOut.generatedAt.slice(0, 10)}`,
    bodyHtml: card({ title: 'Key metrics', contentHtml: gridHtml }),
    footer: 'OpenClaw Portfolio Manager — operator-only',
  });
  const htmlPath = path.join(outDir, `${ARTIFACT_PREFIX}.html`);
  fs.writeFileSync(htmlPath, htmlOut);

  return { ok: true, generatedAt: jsonOut.generatedAt, items: items.length, paths: [jsonPath, mdPath, htmlPath] };
}

module.exports = { generateUsageKpiArtifacts, ARTIFACT_PREFIX };
