const fs = require('fs');
const path = require('path');
const assert = require('assert');

(function main() {
  const docPath = path.join(process.cwd(), 'docs', 'execution-command-surface.md');
  const text = fs.readFileSync(docPath, 'utf8');

  const requiredLines = [
    '# Execution Command Surface',
    'Use `node scripts/trade.js ...` as the primary operator command family.',
    '`trade preflight`',
    '`trade authority`',
    '`trade config`',
    '`trade delivery`',
    '`trade reconcile-live`',
    '`trade arm-open`',
    '`trade disarm-open`',
    '`trade submit`',
    '`trade queue-open`',
    '`trade requeue-open`',
    '`trade cancel`',
    '`trade status`',
    '`trade history`',
    '`trade validate`',
    '`trade propose`',
    '## Diagnostic guidance',
    'prefer the canonical command output',
    '## Safety rule',
  ];

  for (const line of requiredLines) {
    assert(text.includes(line), `Expected execution command surface doc to include: ${line}`);
  }

  console.log(JSON.stringify({ ok: true, requiredLines: requiredLines.length }, null, 2));
})();
