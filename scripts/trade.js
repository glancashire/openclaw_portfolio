#!/usr/bin/env node
'use strict';

/**
 * Unified Trading CLI
 * Usage: node scripts/trade.js <command> [options]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const IBKR_CLI = path.join(__dirname, '..', 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const command = args[0];
const flags = args.slice(1);
const hasFlag = (f) => flags.includes(f);
const DRY_RUN = hasFlag('--dry-run');
const JSON_OUT = hasFlag('--json');

function ibkr(cmd) {
  return execSync(`python3 ${IBKR_CLI} ${cmd}`, { encoding: 'utf8', cwd: ROOT, timeout: 30000 }).trim();
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function showHelp() {
  console.log(`
Trading CLI — Unified entry point for portfolio trading operations

Usage: node scripts/trade.js <command> [options]

Commands:
  propose     Generate trade proposal based on portfolio drift
  validate    Run ETF quality filter on current trade instruments
  submit      Place approved orders (respects market hours + quality filter)
  status      Show open orders and fill notification state
  cancel      Cancel open orders (--order-id <id> or --all)
  history     Show recent trade executions

Options:
  --dry-run   Simulate without placing real orders
  --json      Output in JSON format
  --force     Override market hours check (submit only)
  --help      Show this help

Examples:
  node scripts/trade.js status
  node scripts/trade.js validate
  node scripts/trade.js submit --dry-run
  node scripts/trade.js cancel --all
  node scripts/trade.js history --json
`);
}

// --- Commands ---

function cmdValidate() {
  const { validateTradeList, ETF_METADATA } = require('../lib/etfQualityFilter');
  const symbols = Object.keys(ETF_METADATA);
  const trades = symbols.map(s => ({ symbol: s }));
  const result = validateTradeList(trades);

  if (JSON_OUT) {
    printJson(result);
    return;
  }

  console.log('ETF Quality Validation\n');
  for (const r of result.results) {
    const icon = r.pass ? '✓' : '✗';
    const ter = r.meta ? ` (TER: ${r.meta.terPct}%, ${r.meta.replication})` : '';
    const reason = r.pass ? '' : ` — ${r.reasons.join(', ')}`;
    console.log(`  ${icon} ${r.symbol}${ter}${reason}`);
  }
  console.log(`\nResult: ${result.allPass ? 'ALL PASS' : 'SOME FAILED'}`);
  if (!result.allPass) process.exit(1);
}

function cmdStatus() {
  const openOrders = JSON.parse(ibkr('open-orders --json'));
  const stateFile = path.join(ROOT, 'runtime', 'fill-notifications-state.json');
  let state = { notifiedFills: [] };
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}

  if (JSON_OUT) {
    printJson({ openOrders, notifiedFills: state.notifiedFills });
    return;
  }

  console.log('Open Orders\n');
  if (openOrders.length === 0) {
    console.log('  No open orders.');
  } else {
    for (const o of openOrders) {
      console.log(`  ${o.action} ${o.quantity} ${o.symbol} @ ${o.orderType} ${o.status} (id: ${o.orderId})`);
    }
  }
  console.log(`\nNotified fills: ${state.notifiedFills.length}`);
  if (state.notifiedFills.length > 0) {
    console.log(`  Order IDs: ${state.notifiedFills.join(', ')}`);
  }
}

function cmdSubmit() {
  const { isMarketOpen, nextOpenTime } = require('../lib/marketHours');
  const { validateTradeList } = require('../lib/etfQualityFilter');

  if (!DRY_RUN && !hasFlag('--force')) {
    const market = isMarketOpen('EBS');
    if (!market.open) {
      const msg = `Market is closed: ${market.reason}. Next open: ${nextOpenTime('EBS')}`;
      if (JSON_OUT) { printJson({ error: msg }); } else { console.error(`✗ ${msg}`); }
      process.exit(1);
    }
  }

  // Delegate to submit-orders-at-open.js
  const extraArgs = DRY_RUN ? '--dry-run' : '';
  const forceArg = hasFlag('--force') ? '--force' : '';
  try {
    const out = execSync(`node ${path.join(__dirname, 'submit-orders-at-open.js')} ${extraArgs} ${forceArg}`, { encoding: 'utf8', cwd: ROOT, timeout: 120000 });
    console.log(out);
  } catch (e) {
    console.error(e.stdout || e.stderr || e.message);
    process.exit(1);
  }
}

function cmdCancel() {
  const orderId = flags.find(f => !f.startsWith('-'));
  const cancelAll = hasFlag('--all');

  if (!cancelAll && !orderId) {
    console.error('Usage: trade cancel --all  OR  trade cancel <orderId>');
    process.exit(1);
  }

  if (cancelAll) {
    const openOrders = JSON.parse(ibkr('open-orders --json'));
    if (openOrders.length === 0) {
      console.log('No open orders to cancel.');
      return;
    }
    const results = [];
    for (const o of openOrders) {
      if (DRY_RUN) {
        results.push({ orderId: o.orderId, symbol: o.symbol, status: 'dry-run' });
        continue;
      }
      try {
        const r = JSON.parse(ibkr(`cancel-order --order-id ${o.orderId} --json`));
        results.push({ orderId: o.orderId, symbol: o.symbol, status: r[0]?.status || 'cancelled' });
      } catch (e) {
        results.push({ orderId: o.orderId, symbol: o.symbol, status: 'error', error: e.message });
      }
    }
    if (JSON_OUT) { printJson(results); }
    else {
      for (const r of results) console.log(`  ${r.status === 'error' ? '✗' : '✓'} ${r.symbol} (${r.orderId}) → ${r.status}`);
    }
  } else {
    if (DRY_RUN) {
      console.log(`[DRY-RUN] Would cancel order ${orderId}`);
      return;
    }
    const r = ibkr(`cancel-order --order-id ${orderId} --json`);
    if (JSON_OUT) { console.log(r); } else { console.log(`Cancelled order ${orderId}`); }
  }
}

function cmdHistory() {
  try {
    const executions = JSON.parse(ibkr('executions --json'));
    if (JSON_OUT) { printJson(executions); return; }
    console.log('Recent Executions\n');
    if (executions.length === 0) {
      console.log('  No recent executions.');
    } else {
      for (const e of executions) {
        console.log(`  ${e.side || e.action} ${e.shares || e.cumQty} ${e.symbol} @ ${e.price || e.avgPrice} ${e.currency || ''} (${e.time || ''})`);
      }
    }
  } catch (e) {
    if (JSON_OUT) { printJson({ error: e.message }); } else { console.error('Failed to fetch executions:', e.message); }
    process.exit(1);
  }
}

function cmdPropose() {
  console.log('Trade proposal generation based on portfolio drift.');
  console.log('See: runtime/trade-proposal-2026-05-08.md for the current proposal.');
  console.log('\nTo generate a new proposal, analyze portfolio drift against targets');
  console.log('and create a new trade-proposal file in runtime/.');
}

// --- Dispatch ---
switch (command) {
  case 'validate': cmdValidate(); break;
  case 'status': cmdStatus(); break;
  case 'submit': cmdSubmit(); break;
  case 'cancel': cmdCancel(); break;
  case 'history': cmdHistory(); break;
  case 'propose': cmdPropose(); break;
  case '--help': case '-h': case 'help': case undefined: showHelp(); break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
