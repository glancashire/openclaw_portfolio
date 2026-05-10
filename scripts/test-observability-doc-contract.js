const fs = require('fs');
const path = require('path');
const assert = require('assert');

(function main() {
  const docPath = path.join(process.cwd(), 'docs', 'observability.md');
  const text = fs.readFileSync(docPath, 'utf8');

  const required = [
    '# Observability',
    'trade.js preflight',
    'trade.js authority',
    'trade.js config',
    'trade.js delivery',
    'trade.js status',
    'runtime/events/runtime-events.jsonl',
    '## Diagnostic interpretation guide',
    'prefer the canonical command output',
  ];

  for (const item of required) {
    assert(text.includes(item), `Expected observability doc to include: ${item}`);
  }

  console.log(JSON.stringify({ ok: true, requiredLines: required.length }, null, 2));
})();
