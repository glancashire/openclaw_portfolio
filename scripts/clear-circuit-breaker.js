#!/usr/bin/env node
'use strict';

/* Phase 199 — Clear a tripped circuit breaker so reproposals can resume. */

const path = require('path');
const ROOT = path.join(__dirname, '..');
const { clearCircuitBreaker, listCircuitBreakers } = require(path.join(ROOT, 'src/execution/cancelLoopBreaker'));

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    if (a === '--list') { args.list = true; continue; }
    if (!a.startsWith('--')) continue;
    const stripped = a.replace(/^--/, '');
    const eq = stripped.indexOf('=');
    const k = eq === -1 ? stripped : stripped.slice(0, eq);
    const v = eq === -1 ? true : stripped.slice(eq + 1);
    args[k] = v;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.list) {
    const items = listCircuitBreakers({ rootDir: ROOT });
    console.log(JSON.stringify(items, null, 2));
    return;
  }
  if (!args.portfolio || !args.instrument) {
    console.error('Usage: node scripts/clear-circuit-breaker.js --portfolio=<id> --instrument=<isin-or-symbol> [--reason="text"] [--operator="name"]');
    console.error('       node scripts/clear-circuit-breaker.js --list');
    process.exit(1);
  }
  const result = clearCircuitBreaker({
    portfolio: args.portfolio,
    instrument: args.instrument,
    rootDir: ROOT,
    reason: typeof args.reason === 'string' ? args.reason : null,
    operator: typeof args.operator === 'string' ? args.operator : null,
  });
  console.log(JSON.stringify({ ...result, portfolio: args.portfolio, instrument: args.instrument }, null, 2));
}

main();
