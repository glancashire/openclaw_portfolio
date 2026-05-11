'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'scripts/submit-orders-at-open.js'), 'utf8');
  assert(source.includes('function clearTradeBlock('), 'Expected clearTradeBlock helper');
  assert(source.includes("clearTradeBlock(trade);"), 'Expected successful policy path to clear stale block state');
  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
