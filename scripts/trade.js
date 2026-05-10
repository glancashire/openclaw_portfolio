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
const FORCE = hasFlag('--force');

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
  preflight     Canonical live-readiness / Monday-execution truth surface
  authority     Canonical effective-config / execution-authority truth surface
  arm-open      Explicitly arm the next market-open execution window
  disarm-open   Clear any armed market-open execution window
  propose       Generate trade proposal based on portfolio drift
  validate      Run ETF quality filter on current trade instruments
  submit        Place approved orders (respects market hours + quality filter)
  queue-open    Queue a trade row for the market-open runner
  requeue-open  Requeue a blocked trade row for a retry at market open
  status        Show open orders and fill notification state
  cancel        Cancel open orders (--order-id <id> or --all)
  history       Show recent trade executions

Options:
  --dry-run   Simulate without placing real orders
  --json      Output in JSON format
  --force     Override market hours check (submit only)
  --help      Show this help

Examples:
  node scripts/trade.js preflight --json
  node scripts/trade.js authority --json
  node scripts/trade.js arm-open --hours 18
  node scripts/trade.js disarm-open
  node scripts/trade.js status
  node scripts/trade.js validate
  node scripts/trade.js submit --dry-run
  node scripts/trade.js queue-open --ticker AAA --action buy
  node scripts/trade.js requeue-open --ticker AAA --action buy
  node scripts/trade.js cancel --all
  node scripts/trade.js history --json
`);
}

function resolvePortfolioDir() {
  const portfolioArg = flags.find((flag, idx) => !flag.startsWith('-') && (idx === 0 || !flags[idx - 1].startsWith('--')));
  return portfolioArg ? path.resolve(portfolioArg) : path.join(ROOT, 'portfolio', 'etf');
}

function cmdAuthority() {
  const portfolioDir = resolvePortfolioDir();
  const { evaluateExecutionAuthority } = require('../src/execution/executionAuthority');
  evaluateExecutionAuthority({ portfolioDir }).then((result) => {
    if (JSON_OUT) {
      printJson(result);
    } else {
      console.log(`Execution authority for ${result.portfolio}`);
      console.log(`- portfolio status: ${result.portfolioStatus}`);
      console.log(`- execution mode: ${result.executionMode}`);
      console.log(`- broker account reference: ${result.brokerAccountReference || 'n/a'}`);
      console.log(`- broker readiness: ${result.brokerReadiness.message}`);
      console.log(`- live arm: ${result.liveArm.armedForMarketOpen ? `armed until ${result.liveArm.armExpiresAt || 'unknown'}` : 'not armed'}`);
      console.log(`- runtime pause: ${result.runtimePause.stopAutomation ? `paused after ${result.runtimePause.consecutive} errors` : 'not paused'}`);
      console.log(`- live execution possible now: ${result.effectiveAuthority.liveExecutionPossibleNow}`);
      console.log(`- explicit operator action required: ${result.effectiveAuthority.requiresExplicitOperatorAction}`);
    }
  }).catch((error) => {
    console.error(error.stack || String(error));
    process.exit(1);
  });
}

function cmdPreflight() {
  const portfolioDir = resolvePortfolioDir();
  const { evaluateLiveReadinessPreflight } = require('../src/execution/liveReadinessPreflight');
  evaluateLiveReadinessPreflight({ portfolioDir }).then((result) => {
    if (JSON_OUT) {
      printJson(result);
    } else {
      console.log(`Live readiness preflight for ${result.portfolio}`);
      console.log(`- ok: ${result.ok}`);
      console.log(`- execution mode: ${result.executionMode}`);
      console.log(`- armed for market open: ${result.armedForMarketOpen}`);
      console.log(`- arm expires at: ${result.armExpiresAt || 'n/a'}`);
      console.log(`- broker readiness: ${result.brokerReadiness.message}`);
      console.log(`- approved rows: ${result.approvalState.approvedCount}`);
      console.log(`- executable rows: ${result.approvalState.executableCount}`);
      if (result.blockers.length) {
        console.log('Blockers:');
        for (const blocker of result.blockers) console.log(`- [${blocker.code}] ${blocker.message}`);
      }
      if (result.warnings.length) {
        console.log('Warnings:');
        for (const warning of result.warnings) console.log(`- [${warning.code}] ${warning.message}`);
      }
      console.log(`Recommended next action: ${result.recommendedNextAction}`);
    }
    if (!result.ok) process.exit(2);
  }).catch((error) => {
    console.error(error.stack || String(error));
    process.exit(1);
  });
}

function cmdArmOpen() {
  const portfolioDir = resolvePortfolioDir();
  const hoursIdx = flags.findIndex((flag) => flag === '--hours');
  const hours = hoursIdx >= 0 ? Number(flags[hoursIdx + 1]) : 24;
  const { armLiveExecutionWindow } = require('../src/execution/liveReadinessPreflight');
  const armed = armLiveExecutionWindow(portfolioDir, {
    expiresAt: new Date(Date.now() + hours * 36e5).toISOString(),
    note: 'Armed from canonical trade CLI.',
  });
  if (JSON_OUT) printJson({ ok: true, armedForMarketOpen: true, ...armed });
  else console.log(`✓ Armed live execution window until ${armed.expiresAt}`);
}

function cmdDisarmOpen() {
  const portfolioDir = resolvePortfolioDir();
  const { clearLiveExecutionArm } = require('../src/execution/liveReadinessPreflight');
  clearLiveExecutionArm(portfolioDir);
  if (JSON_OUT) printJson({ ok: true, armedForMarketOpen: false });
  else console.log('✓ Cleared live execution arm');
}

function cmdValidate() {
  const { validateTradeList, ETF_METADATA } = require('../lib/etfQualityFilter');
  const symbols = Object.keys(ETF_METADATA);
  const trades = symbols.map((symbol) => ({ symbol }));
  const result = validateTradeList(trades);

  if (JSON_OUT) {
    printJson(result);
    return;
  }

  console.log('ETF Quality Validation\n');
  for (const row of result.results) {
    const icon = row.pass ? '✓' : '✗';
    const ter = row.meta ? ` (TER: ${row.meta.terPct}%, ${row.meta.replication})` : '';
    const reason = row.pass ? '' : ` — ${row.reasons.join(', ')}`;
    console.log(`  ${icon} ${row.symbol}${ter}${reason}`);
  }
  console.log(`\nResult: ${result.allPass ? 'ALL PASS' : 'SOME FAILED'}`);
  if (!result.allPass) process.exit(1);
}

function cmdQueueOpen() {
  const tickerFlagIndex = flags.findIndex((flag) => flag === '--ticker');
  const actionFlagIndex = flags.findIndex((flag) => flag === '--action');
  const ticker = tickerFlagIndex >= 0 ? flags[tickerFlagIndex + 1] : null;
  const action = actionFlagIndex >= 0 ? flags[actionFlagIndex + 1] : null;
  const portfolioArg = flags.find((flag) => !flag.startsWith('-') && flag !== ticker && flag !== action);
  const portfolioDir = portfolioArg ? path.resolve(portfolioArg) : path.join(ROOT, 'portfolio', 'etf');

  if (!ticker || !action) {
    console.error('Usage: trade queue-open [portfolio-dir] --ticker <tickerOrIsin> --action <buy|sell>');
    process.exit(1);
  }

  const { queueTradeRowForOpenRunner } = require('../src/execution/tradeState');
  const { recordRuntimeEvent } = require('../src/observability/runtimeEvents');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const result = queueTradeRowForOpenRunner(tradesPath, { tickerOrIsin: ticker, action });
  if (result.updated !== 1) {
    const message = `No eligible trade row was queued for ${ticker} ${action}.`;
    if (JSON_OUT) printJson({ ok: false, updated: result.updated, message });
    else console.error(`✗ ${message}`);
    process.exit(1);
  }

  recordRuntimeEvent({
    level: 'info',
    category: 'execution',
    action: 'queue_open_runner',
    portfolio: path.basename(portfolioDir),
    mode: 'operator_command',
    status: 'queued',
    summary: `Queued ${ticker} ${action} for market-open runner first handoff.`,
    details: { ticker, action, approval: 'queued_for_open_runner', retry: false },
  });

  const payload = {
    ok: true,
    updated: result.updated,
    ticker,
    action,
    approval: 'queued_for_open_runner',
    nextAction: 'First open-runner attempt pending.',
  };
  if (JSON_OUT) printJson(payload);
  else console.log(`✓ Queued ${ticker} ${action} for market-open runner`);
}

function cmdRequeueOpen() {
  const tickerFlagIndex = flags.findIndex((flag) => flag === '--ticker');
  const actionFlagIndex = flags.findIndex((flag) => flag === '--action');
  const ticker = tickerFlagIndex >= 0 ? flags[tickerFlagIndex + 1] : null;
  const action = actionFlagIndex >= 0 ? flags[actionFlagIndex + 1] : null;
  const portfolioArg = flags.find((flag) => !flag.startsWith('-') && flag !== ticker && flag !== action);
  const portfolioDir = portfolioArg ? path.resolve(portfolioArg) : path.join(ROOT, 'portfolio', 'etf');

  if (!ticker || !action) {
    console.error('Usage: trade requeue-open [portfolio-dir] --ticker <tickerOrIsin> --action <buy|sell>');
    process.exit(1);
  }

  const { requeueBlockedTradeRow } = require('../src/execution/tradeState');
  const { recordRuntimeEvent } = require('../src/observability/runtimeEvents');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const result = requeueBlockedTradeRow(tradesPath, { tickerOrIsin: ticker, action });
  if (result.updated !== 1) {
    const message = `No blocked trade row was requeued for ${ticker} ${action}.`;
    if (JSON_OUT) printJson({ ok: false, updated: result.updated, message });
    else console.error(`✗ ${message}`);
    process.exit(1);
  }

  recordRuntimeEvent({
    level: 'info',
    category: 'execution',
    action: 'queue_open_runner',
    portfolio: path.basename(portfolioDir),
    mode: 'operator_command',
    status: 'queued_retry',
    summary: `Queued ${ticker} ${action} for market-open runner retry after operator recovery.`,
    details: { ticker, action, approval: 'queued_for_open_runner', retry: true },
  });

  const payload = {
    ok: true,
    updated: result.updated,
    ticker,
    action,
    approval: 'queued_for_open_runner',
    retry: true,
    nextAction: 'Retry at next intended market-open run after operator recovery.',
  };
  if (JSON_OUT) printJson(payload);
  else console.log(`✓ Requeued ${ticker} ${action} for market-open retry`);
}

function cmdStatus() {
  const { summarizeOpenRunnerRetryState } = require('../src/execution/tradeState');
  const portfolioArg = flags.find((flag) => !flag.startsWith('-'));
  const portfolioDir = portfolioArg ? path.resolve(portfolioArg) : path.join(ROOT, 'portfolio', 'etf');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const openRunnerRetryState = summarizeOpenRunnerRetryState(tradesPath);
  let openOrders = [];
  try {
    openOrders = JSON.parse(ibkr('open-orders --json'));
  } catch (error) {
    if (JSON_OUT) {
      printJson({ error: 'IB Gateway not connected', openOrders: [], notifiedFills: [], openRunnerRetryState });
      return;
    }
    console.log('Open Orders\n');
    console.log('  ⚠️ IB Gateway not connected. Cannot fetch open orders.');
    console.log(`  Error: ${error.message.split('\n')[0]}`);
    const stateFile = path.join(ROOT, 'runtime', 'fill-notifications-state.json');
    let state = { notifiedFills: [] };
    try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
    console.log(`\nOpen-runner queue: ${openRunnerRetryState.queuedInitial} first handoff, ${openRunnerRetryState.queuedRetry} retry`);
    console.log(`\nNotified fills: ${state.notifiedFills.length}`);
    return;
  }

  const stateFile = path.join(ROOT, 'runtime', 'fill-notifications-state.json');
  let state = { notifiedFills: [] };
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}

  if (JSON_OUT) {
    printJson({ openOrders, notifiedFills: state.notifiedFills, openRunnerRetryState });
    return;
  }

  console.log('Open Orders\n');
  if (openOrders.length === 0) {
    console.log('  No open orders.');
  } else {
    for (const order of openOrders) {
      console.log(`  ${order.action} ${order.quantity} ${order.symbol} @ ${order.orderType} ${order.status} (id: ${order.orderId})`);
    }
  }
  console.log(`\nOpen-runner queue: ${openRunnerRetryState.queuedInitial} first handoff, ${openRunnerRetryState.queuedRetry} retry`);
  console.log(`\nNotified fills: ${state.notifiedFills.length}`);
  if (state.notifiedFills.length > 0) {
    console.log(`  Order IDs: ${state.notifiedFills.join(', ')}`);
  }
}

function cmdSubmit() {
  const { isMarketOpen, nextOpenTime } = require('../lib/marketHours');

  if (!DRY_RUN && !FORCE) {
    const market = isMarketOpen('EBS');
    if (!market.open) {
      const msg = `Market is closed: ${market.reason}. Next open: ${nextOpenTime('EBS')}`;
      if (JSON_OUT) printJson({ error: msg });
      else console.error(`✗ ${msg}`);
      process.exit(1);
    }
  }

  const extraArgs = DRY_RUN ? ['--dry-run'] : [];
  const forceArg = FORCE ? ['--force'] : [];
  try {
    const out = execSync(`node ${path.join(__dirname, 'submit-orders-at-open.js')} ${[...extraArgs, ...forceArg].join(' ')}`, {
      encoding: 'utf8',
      cwd: ROOT,
      timeout: 120000,
    });
    console.log(out);
  } catch (error) {
    console.error(error.stdout || error.stderr || error.message);
    process.exit(1);
  }
}

function cmdCancel() {
  const orderId = flags.find((flag) => !flag.startsWith('-'));
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
    for (const order of openOrders) {
      if (DRY_RUN) {
        results.push({ orderId: order.orderId, symbol: order.symbol, status: 'dry-run' });
        continue;
      }
      try {
        const response = JSON.parse(ibkr(`cancel-order --order-id ${order.orderId} --json`));
        results.push({ orderId: order.orderId, symbol: order.symbol, status: response[0]?.status || 'cancelled' });
      } catch (error) {
        results.push({ orderId: order.orderId, symbol: order.symbol, status: 'error', error: error.message });
      }
    }
    if (JSON_OUT) printJson(results);
    else {
      for (const result of results) console.log(`  ${result.status === 'error' ? '✗' : '✓'} ${result.symbol} (${result.orderId}) → ${result.status}`);
    }
    return;
  }

  if (DRY_RUN) {
    console.log(`[DRY-RUN] Would cancel order ${orderId}`);
    return;
  }
  const response = ibkr(`cancel-order --order-id ${orderId} --json`);
  if (JSON_OUT) console.log(response);
  else console.log(`Cancelled order ${orderId}`);
}

function cmdHistory() {
  try {
    const executions = JSON.parse(ibkr('executions --json'));
    if (JSON_OUT) {
      printJson(executions);
      return;
    }
    console.log('Recent Executions\n');
    if (executions.length === 0) {
      console.log('  No recent executions.');
    } else {
      for (const execution of executions) {
        console.log(`  ${execution.side || execution.action} ${execution.shares || execution.cumQty} ${execution.symbol} @ ${execution.price || execution.avgPrice} ${execution.currency || ''} (${execution.time || ''})`);
      }
    }
  } catch (error) {
    if (JSON_OUT) printJson({ error: error.message });
    else console.error('Failed to fetch executions:', error.message);
    process.exit(1);
  }
}

function cmdPropose() {
  const { analyzeDrift } = require('../lib/portfolioDrift');
  const { generateProposal } = require('../lib/tradeProposalGenerator');
  const { formatProposalMarkdown } = require('../lib/tradeProposalFormatter');

  let totalValue;
  let cashChf;
  let positions;

  if (DRY_RUN) {
    totalValue = 5000;
    cashChf = 5000;
    positions = [];
  } else {
    try {
      const accountRaw = ibkr('account-summary');
      const nlMatch = accountRaw.match(/tag=NetLiquidation\s+value=([\d.]+)/);
      const cashMatch = accountRaw.match(/tag=TotalCashValue\s+value=([\d.]+)/);
      totalValue = nlMatch ? parseFloat(nlMatch[1]) : 5000;
      cashChf = cashMatch ? parseFloat(cashMatch[1]) : 5000;

      const posRaw = JSON.parse(ibkr('positions --json'));
      positions = posRaw.map((position) => ({
        symbol: position.contract?.symbol || position.symbol,
        marketValue: position.marketValue || (position.avgCost * position.position),
      }));
    } catch (error) {
      console.error('Failed to fetch account data:', error.message);
      console.error('Use --dry-run for mock data.');
      process.exit(1);
    }
  }

  const drift = analyzeDrift({ totalValue, cashChf, positions });
  const prices = {
    VUSA: { price: 109.5, currency: 'CHF', exchange: 'EBS' },
    SLICHA: { price: 222.0, currency: 'CHF', exchange: 'EBS' },
    EMUAA: { price: 40.0, currency: 'EUR', exchange: 'EBS' },
  };

  const proposal = generateProposal({ drift, prices });

  if (JSON_OUT) {
    printJson({ drift, proposal });
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const md = formatProposalMarkdown({ trades: proposal.trades, summary: proposal.summary, drift, date });
  const outPath = path.join(ROOT, 'runtime', `trade-proposal-${date}.md`);
  fs.writeFileSync(outPath, md);

  console.log(md);
  console.log(`\nProposal written to: ${outPath}`);
}

switch (command) {
  case 'preflight': cmdPreflight(); break;
  case 'authority': cmdAuthority(); break;
  case 'arm-open': cmdArmOpen(); break;
  case 'disarm-open': cmdDisarmOpen(); break;
  case 'validate': cmdValidate(); break;
  case 'status': cmdStatus(); break;
  case 'submit': cmdSubmit(); break;
  case 'queue-open': cmdQueueOpen(); break;
  case 'requeue-open': cmdRequeueOpen(); break;
  case 'cancel': cmdCancel(); break;
  case 'history': cmdHistory(); break;
  case 'propose': cmdPropose(); break;
  case '--help':
  case '-h':
  case 'help':
  case undefined:
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
