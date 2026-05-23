const assert = require('assert');
const { buildDigestSubject, resolveDigestRecipients } = require('../src/reporting/dashboardDigest');

(function main() {
  assert.strictEqual(
    buildDigestSubject({ portfolioName: 'etf', frequency: 'daily', generatedAt: '2026-05-23T07:00:00Z' }),
    '[etf] Daily portfolio digest — 2026-05-23'
  );
  assert.strictEqual(
    buildDigestSubject({ portfolioName: 'etf', frequency: 'weekly', generatedAt: '2026-05-23T17:00:00Z' }),
    '[etf] Weekly portfolio digest — week of 2026-05-23'
  );

  assert.deepStrictEqual(
    resolveDigestRecipients({ emailRecipients: ['a@example.com'] }, {}),
    ['a@example.com']
  );
  assert.deepStrictEqual(
    resolveDigestRecipients({ emailRecipients: [] }, { MAILGUN_RECIPIENT: 'fallback@example.com' }),
    ['fallback@example.com']
  );
  assert.deepStrictEqual(
    resolveDigestRecipients({ emailRecipients: [] }, {}),
    []
  );

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
