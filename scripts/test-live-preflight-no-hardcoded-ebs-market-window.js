const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/execution/liveReadinessPreflight.js'), 'utf8');
assert(!source.includes("const exchange = 'EBS';"), 'live readiness preflight should not hardcode EBS as the universal venue gate');
assert(source.includes('function evaluateMarketWindow('), 'expected evaluateMarketWindow helper to exist');
console.log(JSON.stringify({ ok: true }, null, 2));
