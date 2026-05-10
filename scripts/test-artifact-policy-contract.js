'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const policyPath = path.join(process.cwd(), 'artifact-policy.md');
const text = fs.readFileSync(policyPath, 'utf8');

const requiredSections = [
  '## 1. Source-of-truth files',
  '## 2. Derived but versioned artifacts',
  '## 3. Runtime-ephemeral artifacts',
  '## 4. Commit hygiene expectations',
  '## 5. Verification expectation',
  '## 6. Current posture',
];

for (const section of requiredSections) {
  assert(text.includes(section), `Missing required artifact policy section: ${section}`);
}

assert(text.includes('runtime/events/runtime-events.jsonl'), 'Expected runtime events artifact reference');
assert(text.includes('runtime/execution-state.json'), 'Expected execution state artifact reference');
assert(text.includes('runtime/overview'), 'Expected overview artifact reference');
assert(text.includes('summary.json'), 'Expected summary artifact reference');

console.log(JSON.stringify({ ok: true, requiredSections: requiredSections.length }, null, 2));
