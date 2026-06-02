const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const runbookPath = path.join(process.cwd(), 'docs', 'operator-runbooks.md');
  const text = fs.readFileSync(runbookPath, 'utf8');

  assert(text.includes('# Operator runbooks'), 'Expected operator runbooks title');
  assert(text.includes('## Use when'), 'Expected Use when section');
  assert(text.includes('## Key commands'), 'Expected Key commands section');
  assert(text.includes('## What to check after action'), 'Expected post-action checks section');
  assert(text.includes('## Broker readiness note'), 'Expected broker readiness note section');
  assert(text.includes('## Operator reading guide'), 'Expected operator reading guide section');
  assert(text.includes('trade.js preflight'), 'Expected canonical preflight command reference');
  assert(text.includes('trade.js authority'), 'Expected canonical authority command reference');
  assert(text.includes('trade.js config'), 'Expected canonical config command reference');
  assert(text.includes('trade.js delivery'), 'Expected canonical delivery command reference');
  assert(text.includes('scripts/operator-incident-summary.js') || text.includes('operator incident summary'), 'Expected operator incident surface reference');
  assert(text.includes('docs/reporting-command-surface.md'), 'Expected reporting command surface reference');
  assert(text.includes('show-dashboard.js'), 'Expected console dashboard reference');
  assert(text.includes('run-health-check.js'), 'Expected health-check reference');
  assert(text.includes('send-dashboard-digest.js'), 'Expected digest surface reference');
  assert(text.includes('runtime/events/runtime-events.jsonl'), 'Expected runtime events evidence reference');
  assert(text.includes('check-transmitted-live-readiness.js'), 'Expected transmitted live readiness command reference');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
