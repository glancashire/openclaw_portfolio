const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { appendObservabilityEvent, readObservabilityEvents, observabilityPaths } = require('../src/execution/selfHeal');

(function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'self-heal-observability-'));
  const first = appendObservabilityEvent({ kind: 'health_check', portfolio: 'demo', health: 'blocked' }, { repoRoot });
  assert(fs.existsSync(first.eventLogPath));
  const second = appendObservabilityEvent({ kind: 'health_check', portfolio: 'demo', health: 'healthy' }, { repoRoot });
  assert.strictEqual(first.eventLogPath, second.eventLogPath);
  const events = readObservabilityEvents({ repoRoot });
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[0].kind, 'health_check');
  assert.strictEqual(observabilityPaths(repoRoot).eventLogPath, first.eventLogPath);
  console.log(JSON.stringify({ ok: true, events: events.length }, null, 2));
})();
