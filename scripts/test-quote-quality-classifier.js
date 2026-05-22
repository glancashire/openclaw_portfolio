'use strict';

/* Phase 200 — quote quality classifier tests. */

const assert = require('assert');
const path = require('path');
const realRoot = path.resolve(__dirname, '..');
const { classifyQuoteQuality, tierSeverity } = require(path.join(realRoot, 'src/execution/quoteQuality'));

(() => {
  // Tier: live
  let r = classifyQuoteQuality({ conid: '1', '31': 100, '84': 99.5, '86': 100.1, '7295': 100, close: 100, lastTimestamp: '1779000000' });
  assert.strictEqual(r.tier, 'live', 'ask + lastTimestamp + last => live');
  assert.deepStrictEqual(r.missingFields.sort(), [], 'no missing fields');

  // Tier: one_sided (only ask, no live last timestamp)
  r = classifyQuoteQuality({ conid: '1', '86': 100.1, '7295': 100, close: 100 });
  assert.strictEqual(r.tier, 'one_sided', 'ask only => one_sided');
  assert(r.missingFields.includes('liveLast'));
  assert(r.missingFields.includes('bid'));

  // Tier: one_sided (only live last)
  r = classifyQuoteQuality({ conid: '1', '31': 100, '7295': 99, close: 99, lastTimestamp: '1779000000' });
  assert.strictEqual(r.tier, 'one_sided', 'live last only => one_sided');

  // Tier: stale_only — only close (today's SPMCHA case)
  r = classifyQuoteQuality({ conid: '91639399', '31': 128.5, '7295': 128.5, close: 128.5 });
  assert.strictEqual(r.tier, 'stale_only', 'last==close fallback with no timestamp => stale_only');
  assert(r.missingFields.includes('ask'));
  assert(r.missingFields.includes('liveLast'));

  // Tier: unknown
  r = classifyQuoteQuality({ conid: '1' });
  assert.strictEqual(r.tier, 'unknown');

  // Severity mapping
  assert.strictEqual(tierSeverity('live'), 'ok');
  assert.strictEqual(tierSeverity('one_sided'), 'warning');
  assert.strictEqual(tierSeverity('stale_only'), 'attention');
  assert.strictEqual(tierSeverity('unknown'), 'critical');

  // Null / undefined input
  r = classifyQuoteQuality(null);
  assert.strictEqual(r.tier, 'unknown');
  r = classifyQuoteQuality(undefined);
  assert.strictEqual(r.tier, 'unknown');

  console.log(JSON.stringify({ ok: true, testsPassed: 8 }));
})();
