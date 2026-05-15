const assert = require('assert');
const { markFillsNotified } = require('../src/reporting/fillNotificationState');

(function main() {
  let state = {
    notifiedFills: [],
    reconciledUnnotifiedFills: [],
    acknowledgedBackfilledFills: [],
  };

  const failedNotification = { attempted: true, sent: false, error: 'mailgun failed' };
  if (failedNotification.sent) state = markFillsNotified(state, [9107]);
  assert.deepStrictEqual(state.notifiedFills, [], 'failed notification should not mark fill notified');

  const skippedNotification = { attempted: false, sent: false, reason: 'email_disabled_by_policy' };
  if (skippedNotification.sent) state = markFillsNotified(state, [9107]);
  assert.deepStrictEqual(state.notifiedFills, [], 'skipped notification should not mark fill notified');

  const sentNotification = { attempted: true, sent: true, result: { id: 'ok' } };
  if (sentNotification.sent) state = markFillsNotified(state, [9107]);
  assert.deepStrictEqual(state.notifiedFills, [9107], 'successful notification should mark fill notified');

  console.log(JSON.stringify({ ok: true, state }, null, 2));
})();
