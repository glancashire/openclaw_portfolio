const assert = require('assert');
const {
  parseHoursSegments,
  evaluateHoursState,
} = require('../src/execution/executionDiagnostics');

const segments = parseHoursSegments('20260521:0900-1745;20260522:CLOSED;20260523:0730-2300');
assert.strictEqual(segments.length, 3);
assert.strictEqual(segments[0].date, '20260521');
assert.strictEqual(segments[1].closed, true);
assert.strictEqual(segments[2].start, '0730');

const inside = evaluateHoursState(segments, new Date('2026-05-21T10:00:00Z'), 'UTC');
assert.strictEqual(inside.status, 'open');
assert.strictEqual(inside.activeSegment.date, '20260521');
assert.strictEqual(inside.activeSegment.start, '0900');

const before = evaluateHoursState(segments, new Date('2026-05-21T08:00:00Z'), 'UTC');
assert.strictEqual(before.status, 'before_open');
assert.strictEqual(before.nextSegment.date, '20260521');
assert.strictEqual(before.nextSegment.start, '0900');

const after = evaluateHoursState(segments, new Date('2026-05-21T18:00:00Z'), 'UTC');
assert.strictEqual(after.status, 'after_close');
assert.strictEqual(after.activeDay.date, '20260521');

const closed = evaluateHoursState(segments, new Date('2026-05-22T12:00:00Z'), 'UTC');
assert.strictEqual(closed.status, 'closed');
assert.strictEqual(closed.activeDay.date, '20260522');

const unknown = evaluateHoursState([], new Date('2026-05-21T12:00:00Z'), 'UTC');
assert.strictEqual(unknown.status, 'unknown');
console.log(JSON.stringify({ ok: true }, null, 2));
