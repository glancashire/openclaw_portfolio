'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  normalizeStatus,
  parseVisualRoadmap,
  parseDetailedSections,
  loadOpenPhasesCard,
  renderOpenPhasesMarkdown,
  normalizeTitleKey,
} = require('../src/reporting/openPhasesCard');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  assert(normalizeStatus('verifying') === 'VERIFYING', 'Expected status normalization');
  assert(normalizeStatus(' waiting ') === 'WAITING', 'Expected trimmed status normalization');

  const markdown = [
    '# Open Phases Overview',
    '',
    '## Visual roadmap',
    '',
    '```text',
    'next-3 session-aware retry ergonomics   [VERIFYING]  ████████░░',
    'Roll-up D auto-remediation decision     [WAITING]    ██░░░░░░░░',
    'Spec §1 closeout                        [PARTIAL]    ████████░░',
    '```',
    '',
    '---',
    '',
    '## next-3 — Session-aware retry ergonomics',
    '**Status:** VERIFYING',
    '- [x] Shared order-preparation helper extracted',
    '- [x] Diagnostics path reuses helper',
    '- [ ] Capture final safe-lane result',
    '- [ ] Capture final npm test result',
    '',
    '---',
    '',
    '## Roll-up D — Auto-remediation decision',
    '**Status:** WAITING ON DECISION',
    '- [x] Guidance exists',
    '- [ ] Decide whether to automate remediation',
    '',
  ].join('\n');

  const roadmap = parseVisualRoadmap(markdown);
  assert(roadmap.length === 3, 'Expected three roadmap items');
  assert(roadmap[0].status === 'VERIFYING', 'Expected verifying status sort first');
  assert(roadmap[0].progressPct === 80, 'Expected progress percentage parsing');

  const details = parseDetailedSections(markdown);
  assert(normalizeTitleKey('next-3 — Session-aware retry ergonomics').includes('session aware retry ergonomics'), 'Expected title normalization');
  assert([...details.keys()].some((key) => key.includes('session aware retry ergonomics')), 'Expected normalized detail key');

  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'open-phases-card-'));
  fs.writeFileSync(path.join(repoRoot, 'OPEN_PHASES_OVERVIEW.md'), markdown);
  const card = loadOpenPhasesCard({ repoRoot });
  assert(card.items.length === 3, 'Expected loaded card items');
  assert(card.items[0].completed.length >= 1, 'Expected completed items merged into card');
  const rendered = renderOpenPhasesMarkdown(card);
  assert(rendered.includes('## Open Phases'), 'Expected markdown section title');
  assert(rendered.includes('### next-3 session-aware retry ergonomics'), 'Expected roadmap title in rendered section');
  assert(rendered.includes('- Status: VERIFYING'), 'Expected rendered status');
  assert(rendered.includes('- Still open:'), 'Expected rendered still-open line');

  const empty = renderOpenPhasesMarkdown({ items: [] });
  assert(empty.includes('No open phase items found'), 'Expected empty-state rendering');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
