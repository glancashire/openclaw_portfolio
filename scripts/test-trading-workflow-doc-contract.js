const fs = require('fs');
const path = require('path');
const assert = require('assert');

(function main() {
  const docPath = path.join(process.cwd(), 'docs', 'trading-workflow.md');
  const text = fs.readFileSync(docPath, 'utf8');

  const required = [
    '# Trading workflow',
    'trade.js preflight',
    'trade.js authority',
    'trade.js config',
    'trade.js delivery',
    'trade.js queue-open',
    'trade.js requeue-open',
    'trade.js status',
    'canonical diagnostic output should win over derived artifacts',
    '`trade preflight` is the decisive live-readiness answer',
    '`trade authority` is the decisive execution-authority answer',
    '`trade config` is the effective redacted broker/runtime configuration surface',
    '`trade delivery` is the decisive delivery-posture answer',
  ];

  for (const item of required) {
    assert(text.includes(item), `Expected trading workflow doc to include: ${item}`);
  }

  console.log(JSON.stringify({ ok: true, requiredLines: required.length }, null, 2));
})();
