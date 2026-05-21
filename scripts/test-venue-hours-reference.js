const assert = require('assert');
const {
  getVenueHoursReference,
  evaluateVenueReferenceState,
} = require('../src/execution/venueHoursReference');

const ibis = getVenueHoursReference('IBIS');
assert.strictEqual(ibis.venue, 'IBIS');
assert.strictEqual(ibis.sourceKind, 'reference');
assert.strictEqual(ibis.session.open, '09:00');
assert.strictEqual(ibis.session.close, '17:30');

const before = evaluateVenueReferenceState(ibis, new Date('2026-05-21T08:00:00Z'));
assert.strictEqual(before.status, 'before_open');

const open = evaluateVenueReferenceState(ibis, new Date('2026-05-21T10:00:00Z'));
assert.strictEqual(open.status, 'open');

const after = evaluateVenueReferenceState(ibis, new Date('2026-05-21T18:00:00Z'));
assert.strictEqual(after.status, 'after_close');

const unknown = getVenueHoursReference('LSEETF');
assert.strictEqual(unknown.venue, 'LSEETF');
assert.strictEqual(unknown.confidence, 'low');
console.log(JSON.stringify({ ok: true }, null, 2));
