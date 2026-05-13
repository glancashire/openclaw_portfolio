const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/brokers/interactive-brokers/nativeClient.js'), 'utf8');
assert(source.includes('buildConidContract(order?.conid, {'), 'expected conid order builder call');
assert(!source.includes('includeSymbol: Boolean(order?.symbol)'), 'did not expect conid order path to force symbol onto contract');
assert(!source.includes('currency: order?.currency || undefined'), 'did not expect conid order path to force currency onto contract');
console.log(JSON.stringify({ ok: true }, null, 2));
