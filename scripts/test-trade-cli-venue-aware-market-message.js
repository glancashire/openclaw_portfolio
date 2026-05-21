const fs = require('fs');
const path = require('path');
const assert = require('assert');

const tradeSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/trade.js'), 'utf8');
assert(!tradeSource.includes("nextOpenTime('EBS')"), 'trade.js should not hardcode EBS next-open messaging when venue-aware diagnostics are available');

const submitSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/submit-orders-at-open.js'), 'utf8');
assert(!submitSource.includes("nextOpenTime('EBS')"), 'submit-orders-at-open.js should not hardcode EBS next-open messaging when venue-aware diagnostics are available');

console.log(JSON.stringify({ ok: true }, null, 2));
