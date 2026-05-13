const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/brokers/interactive-brokers/nativeClient.js'), 'utf8');
assert(source.includes("label: 'native order handshake'"), 'expected dedicated order handshake label');
assert(source.includes('requireNextValidId: true'), 'expected live order path to require nextValidId');
console.log(JSON.stringify({ ok: true }, null, 2));
