const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/brokers/interactive-brokers/nativeClient.js'), 'utf8');
assert(source.includes('let requestCounter = 1;'), 'expected separate request counter');
assert(source.includes('function nextRequestId()'), 'expected nextRequestId helper');
assert(source.includes('const reqId = nextRequestId();'), 'expected market-data paths to use request ids');
assert(source.includes('const orderId = nextOrderId();'), 'expected order placement to use dedicated order ids');
console.log(JSON.stringify({ ok: true }, null, 2));
