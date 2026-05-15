const assert = require('assert');
const { markFillsNotified } = require('../src/reporting/fillNotificationState');

(function main() {
  const next = markFillsNotified({
    notifiedFills: [],
    reconciledUnnotifiedFills: [9107, 9108],
    acknowledgedBackfilledFills: [9109],
  }, [9107, 9109]);

  assert.deepStrictEqual(next.notifiedFills, [9107, 9109]);
  assert.deepStrictEqual(next.reconciledUnnotifiedFills, [9108]);
  assert.deepStrictEqual(next.acknowledgedBackfilledFills, []);

  console.log(JSON.stringify({ ok: true, next }, null, 2));
})();
