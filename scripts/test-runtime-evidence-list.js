const assert = require('assert');
const { listRuntimeEvidencePaths } = require('../src/reporting/runtimeEvidence');

(function main() {
  const paths = listRuntimeEvidencePaths();
  assert(Array.isArray(paths), 'Expected runtime evidence paths array');
  assert(paths.length >= 10, 'Expected substantial runtime evidence coverage');
  assert(paths.includes('runtime/overview/index.html'), 'Expected overview index');
  assert(paths.includes('runtime/overview/portfolio-overview.html'), 'Expected portfolio overview html');
  assert(paths.includes('runtime/overview/report-history.json'), 'Expected report history json');
  assert(paths.includes('runtime/ibkr/native-gateway-keepalive-state.json'), 'Expected keepalive state evidence');
  assert(!paths.includes('runtime/events/runtime-events.jsonl'), 'Did not expect runtime events churn in versioned evidence list');
  assert(!paths.includes('runtime/execution-state.json'), 'Did not expect execution state churn in versioned evidence list');
  assert.strictEqual(new Set(paths).size, paths.length, 'Expected no duplicate runtime evidence paths');
  console.log(JSON.stringify({ ok: true, count: paths.length }, null, 2));
})();
