const assert = require('assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'brokers', 'interactive-brokers', 'nativeClient.js'), 'utf8');
assert(src.includes('outsideRth: order?.outsideRth === true'));
assert(src.includes("goodAfterTime: order?.goodAfterTime ? String(order.goodAfterTime) : ''"));
assert(src.includes("goodTillDate: order?.goodTillDate ? String(order.goodTillDate) : ''"));
console.log(JSON.stringify({ ok: true, timingFlagsForwarded: true }, null, 2));
