const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'monitor-fills.js'), 'utf8');

assert(source.includes('const syntheticBackfill = !fill && isBackfill && order.status === \'filled\''), 'monitor-fills should synthesize backfill fill data from filled trade rows');
assert(source.includes('const effectiveFill = fill || syntheticBackfill;'), 'monitor-fills should use real execution or synthetic backfill fill');
assert(source.includes("execId: `backfill-${order.orderId}`"), 'synthetic backfill should have a stable synthetic exec id');

console.log(JSON.stringify({ ok: true }, null, 2));
