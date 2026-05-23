const assert = require('assert');
const { RUNTIME_EVIDENCE_PATHS } = require('../src/reporting/runtimeEvidence');

(function main() {
  const ephemeral = new Set([
    'runtime/events/runtime-events.jsonl',
    'runtime/execution-state.json',
    'runtime/observability/event-log.jsonl',
  ]);

  for (const path of ephemeral) {
    assert(!RUNTIME_EVIDENCE_PATHS.includes(path), `Expected ${path} to remain ephemeral, not versioned evidence`);
  }

  for (const path of ['runtime/overview/index.html', 'runtime/overview/daily-summary.json', 'runtime/overview/portfolio-overview.html']) {
    assert(RUNTIME_EVIDENCE_PATHS.includes(path), `Expected ${path} to remain versioned evidence`);
  }

  console.log(JSON.stringify({ ok: true, ephemeral: ephemeral.size }, null, 2));
})();
