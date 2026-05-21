const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'monitor-fills.js'), 'utf8');

assert(source.includes("const isBackfill = state.reconciledUnnotifiedFills.includes(order.orderId);"), 'monitor-fills should detect reconciled backlog fills');
assert(!source.includes('if (state.reconciledUnnotifiedFills.includes(order.orderId)) continue;'), 'monitor-fills should no longer skip backfill-eligible fills outright');
assert(source.includes("notificationMode: isBackfill ? 'backfill' : 'live_fill'"), 'monitor-fills should label backfill notifications');

console.log(JSON.stringify({ ok: true }, null, 2));
