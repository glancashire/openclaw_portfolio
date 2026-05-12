'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const source = fs.readFileSync(path.join(__dirname, 'monitor-fills.js'), 'utf8');

assert(source.includes('const { readTradesTable } = require(\'../src/execution/tradeState\');'), 'monitor-fills should source orders from tradeState');
assert(source.includes('function loadKnownOrders('), 'monitor-fills should define loadKnownOrders');
assert(!source.includes('const KNOWN_ORDERS = ['), 'monitor-fills should not use hard-coded KNOWN_ORDERS anymore');
assert(source.includes('Order ${order.orderId} (${order.symbol}) no longer open but no fill record found — likely cancelled/inactive'), 'monitor-fills should distinguish cancelled/inactive from fills');
console.log(JSON.stringify({ ok: true }, null, 2));
