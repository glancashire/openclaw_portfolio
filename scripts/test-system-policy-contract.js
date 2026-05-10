'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const policyPath = path.join(process.cwd(), 'system-policy.md');
const text = fs.readFileSync(policyPath, 'utf8');

const requiredSections = [
  '## 1. Instruction sources',
  '## 2. Execution authority',
  '## 3. Approval rules',
  '## 4. Automation boundaries',
  '## 5. Messaging and notification behavior',
  '## 6. Source of truth vs derived artifacts',
  '## 7. Live-execution prerequisites',
  '## 8. Current posture',
];

for (const section of requiredSections) {
  assert(text.includes(section), `Missing required policy section: ${section}`);
}

assert(text.includes('fail-closed'), 'Expected fail-closed posture');
assert(text.includes('transmitted_live'), 'Expected transmitted_live policy reference');
assert(text.includes('preflight'), 'Expected preflight policy reference');
assert(text.includes('execution-authority') || text.includes('execution authority'), 'Expected execution authority reference');

console.log(JSON.stringify({ ok: true, requiredSections: requiredSections.length }, null, 2));
