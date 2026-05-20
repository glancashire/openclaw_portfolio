const assert = require('assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'execution', 'portfolioExecution.js'), 'utf8');
assert(src.includes("function applyExecutionTimingPolicy(order = {}, instrument = null)"));
assert(src.includes("if (symbol === 'UBSPX' && primaryExchange === 'IBIS')"));
assert(src.includes("if (next.outsideRth == null) next.outsideRth = false;"));
assert(src.includes("if (!next.goodAfterTime) next.goodAfterTime = '20260521 09:00:00 MET';"));
console.log(JSON.stringify({ ok: true, ubspxTimingPolicyPresent: true }, null, 2));
