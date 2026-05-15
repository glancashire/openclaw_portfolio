const assert = require('assert');
const { emailDeliveryReadiness } = require('../src/reporting/emailDelivery');

(function main() {
  const localOnly = emailDeliveryReadiness({ deliveryMode: 'local_only', emailProvider: 'mailgun', emailRecipients: [] }, { pendingActions: [] });
  assert.strictEqual(localOnly.enabled, false);
  assert.strictEqual(localOnly.classification, 'local_only');

  const incomplete = emailDeliveryReadiness({ deliveryMode: 'email_and_repo', emailProvider: 'mailgun', emailRecipients: [] }, { pendingActions: [] });
  assert.strictEqual(incomplete.enabled, true);
  assert.strictEqual(incomplete.ready, false);
  assert(incomplete.missing.includes('emailRecipients'));

  const blocked = emailDeliveryReadiness({ deliveryMode: 'email_and_repo', emailProvider: 'mailgun', emailRecipients: ['lancashire@swift.ch'] }, { pendingActions: ['1 reconciled fill(s) still need notification backfill review.'] });
  assert.strictEqual(blocked.enabled, true);
  assert.strictEqual(blocked.ready, false);
  assert(blocked.missing.includes('pendingDeliveryActions'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
