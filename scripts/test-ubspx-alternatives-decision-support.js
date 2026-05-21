const fs = require('fs');
const path = require('path');
const assert = require('assert');

const target = path.resolve(process.cwd(), 'runtime/ubspx-alternatives-decision-support.md');
assert(fs.existsSync(target), 'expected UBSPX alternatives decision-support artifact');
const text = fs.readFileSync(target, 'utf8');
assert(text.includes('iShares Core S&P 500 UCITS ETF USD (Acc)'), 'expected iShares candidate');
assert(text.includes('Vanguard S&P 500 UCITS ETF (Acc)'), 'expected Vanguard candidate');
assert(text.includes('IE00B3YCGJ38'), 'expected explicit synthetic exclusion');
assert(text.includes('Operational view'), 'expected operational confidence framing');
console.log(JSON.stringify({ ok: true }, null, 2));
