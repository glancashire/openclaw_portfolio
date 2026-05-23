const assert = require('assert');
const { checks } = require('../src/reporting/verifyRepoChecks');

(function main() {
  assert(Array.isArray(checks), 'Expected checks array');
  assert(checks.length >= 20, 'Expected substantial verify-repo coverage');
  const names = checks.map(([name]) => name);
  for (const required of [
    'validate:all-portfolios',
    'check:generated-state',
    'verify:execution',
    'test:structured-summary-artifacts',
    'test:artifact-policy-contract',
    'test:ibkr-readiness',
  ]) {
    assert(names.includes(required), `Missing verify-repo check: ${required}`);
  }
  console.log(JSON.stringify({ ok: true, checks: checks.length }, null, 2));
})();
