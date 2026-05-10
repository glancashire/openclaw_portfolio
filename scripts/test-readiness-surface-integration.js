'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { evaluateLiveReadinessPreflight } = require('../src/execution/liveReadinessPreflight');
const { generateOverviewArtifacts } = require('../src/reporting/summaryArtifacts');

(async () => {
  const repoRoot = process.cwd();
  const portfolioDir = path.join(repoRoot, 'portfolio', 'etf');
  const readiness = await evaluateLiveReadinessPreflight({ portfolioDir });
  const overview = await generateOverviewArtifacts({ repoRoot, writeFiles: true, readiness });
  const summary = JSON.parse(fs.readFileSync(path.join(portfolioDir, 'summary.json'), 'utf8'));
  const recovery = JSON.parse(fs.readFileSync(path.join(portfolioDir, 'recovery-checklist.json'), 'utf8'));
  const summaryHtml = fs.readFileSync(path.join(portfolioDir, 'summary.html'), 'utf8');
  const overviewMarkdown = fs.readFileSync(path.join(repoRoot, 'runtime', 'overview', 'portfolio-overview.md'), 'utf8');
  const cockpit = fs.readFileSync(path.join(repoRoot, 'runtime', 'overview', 'index.html'), 'utf8');

  assert(summary.readiness, 'Expected portfolio summary readiness block');
  assert.strictEqual(summary.readiness.ok, readiness.ok, 'Expected summary readiness ok to match canonical preflight');
  assert.strictEqual(summary.readiness.armedForMarketOpen, readiness.armedForMarketOpen, 'Expected summary arm state to match canonical preflight');
  assert(summary.readiness.recommendedNextAction, 'Expected summary readiness next action');
  assert(summaryHtml.includes('Live readiness:'), 'Expected summary html to include live readiness line');
  assert(summaryHtml.includes('Live arm state:'), 'Expected summary html to include arm state line');
  assert(summaryHtml.includes('Live readiness next step:'), 'Expected summary html to include next step line');
  assert(overviewMarkdown.includes('Open-runner first handoffs'), 'Expected overview markdown to include open-runner queue summary');
  assert(overviewMarkdown.includes('Open-runner retries'), 'Expected overview markdown to include retry queue summary');
  assert(cockpit.includes('Operator Cockpit'), 'Expected cockpit html');
  assert(cockpit.includes('Portfolio Overview'), 'Expected cockpit links');
  assert(recovery.incidentStatus, 'Expected recovery checklist');
  assert(recovery.summary, 'Expected recovery summary block');

  console.log(JSON.stringify({ ok: true, readinessOk: readiness.ok, readinessBlockers: readiness.blockers.length, overviewItems: overview.pendingActions.itemCount }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
