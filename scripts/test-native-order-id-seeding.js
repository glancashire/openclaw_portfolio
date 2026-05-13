const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/brokers/interactive-brokers/nativeClient.js'), 'utf8');
assert(source.includes('seedNextValidOrderId'), 'expected nextValidId seeding helper');
assert(source.includes('api.on(EventName.nextValidId, onNextValidId);'), 'expected nextValidId listener');
assert(source.includes('seedNextValidOrderId(validOrderId);'), 'expected handshake to seed order id from broker');
assert(!source.includes('let reqCounter = 9100;'), 'did not expect hard-coded static order-id seed');
console.log(JSON.stringify({ ok: true }, null, 2));
