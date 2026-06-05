'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { loadOpenPhasesCard } = require('../src/reporting/openPhasesCard');

const ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

(function main() {
  const governance = read('docs/test-governance.md');
  assert(governance.includes('docs/operations/test-lanes.md'), 'governance doc should point at test-lanes');
  assert(governance.includes('config/test-discovery-policy.json'), 'governance doc should point at discovery policy');
  assert(governance.includes('docs/operations/test-manifest.json'), 'governance doc should point at manifest');
  assert(governance.includes('docs/operations/test-coverage-by-domain.json'), 'governance doc should point at domain coverage summary');
  assert(governance.includes('npm test'), 'governance doc should mention npm test');
  assert(governance.includes('npm run test:all -- --lane=safe'), 'governance doc should mention safe-lane command');

  const card = loadOpenPhasesCard({ repoRoot: ROOT });
  assert.strictEqual(card.generatedFrom, 'PLAN.md', 'open phases should load from PLAN.md');
  assert(card.items.length >= 1, 'PLAN should expose at least one roadmap item');
  assert(card.items.some((item) => item.status === 'WAITING'), 'PLAN should expose a waiting backlog item');
  assert(card.items.some((item) => (item.openItems || []).length >= 1), 'PLAN backlog item should list at least one open item');

  const currentPlan = read('PLAN.md');
  assert(currentPlan.includes('## Visual roadmap'), 'PLAN should include visual roadmap');
  assert(!currentPlan.includes('# Email Dashboard Improvement Plan'), 'PLAN should no longer be the stale email-dashboard plan');

  const phase4b = read('archive/phase-plans/2026-06-01-consolidation/phase-4b-test-governance-and-manifest-truth-2026-06-01.md');
  const phase7b = read('archive/phase-plans/2026-06-01-consolidation/phase-7b-cron-health-and-guided-remediation-truth-2026-06-01.md');
  const phaseO1 = read('archive/phase-plans/2026-06-01-consolidation/phase-o1-ibkr-readiness-and-open-work-closeout-plan-2026-05-31.md');
  const fillPhase1 = read('archive/phase-plans/phase-1-fill-confirmation-mail-plan.md');
  const fillRollup = read('archive/phase-plans/fill-confirmation-mail-improvement-plan.md');

  assert(/Status:\s+complete/i.test(phase4b), 'phase 4B plan should be marked complete');
  assert(/Status:\s+complete/i.test(phase7b), 'phase 7B plan should be marked complete');
  assert(/Status:\s+complete/i.test(phaseO1), 'phase O1 plan should be marked complete');
  assert(/Status:\s+complete/i.test(fillPhase1), 'fill phase 1 plan should be marked complete');
  assert(/Status:\s+complete/i.test(fillRollup), 'fill rollup plan should be marked complete');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
