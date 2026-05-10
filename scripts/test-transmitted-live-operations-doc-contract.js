const fs = require('fs');
const path = require('path');
const assert = require('assert');

(function main() {
  const docPath = path.join(process.cwd(), 'docs', 'transmitted-live-operations.md');
  const text = fs.readFileSync(docPath, 'utf8');

  const required = [
    '# Transmitted live execution operations',
    'trade.js preflight',
    'trade.js authority',
    'trade.js config',
    'trade.js delivery',
    'check-transmitted-live-readiness.js',
    'transmittedLiveAck',
    'I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER',
    'Canonical diagnostic output should win over derived dashboards/summaries when they disagree.',
    '`trade preflight` is the decisive readiness answer',
    '`trade authority` is the decisive authority answer',
  ];

  for (const item of required) {
    assert(text.includes(item), `Expected transmitted-live operations doc to include: ${item}`);
  }

  console.log(JSON.stringify({ ok: true, requiredLines: required.length }, null, 2));
})();
