#!/usr/bin/env node
'use strict';

/**
 * backfill-history-net-deposited.js
 *
 * Walks portfolio/<name>/history.md and rewrites every row to include a
 * `Net deposited CHF` column populated by walking the deposits ledger
 * as-of each row's date.
 *
 * Idempotent: if a row already has 9 columns (i.e. already migrated),
 * recompute the net-deposited cell and overwrite it. Legacy 8-column
 * rows are upgraded.
 *
 * Usage:
 *   node scripts/backfill-history-net-deposited.js --portfolio=etf
 *   node scripts/backfill-history-net-deposited.js --portfolio=etf --dry-run
 *
 * Domain: reporting / migration
 */

const fs = require('fs');
const path = require('path');
const { loadDepositsLedger, netDepositedAsOf } = require('../lib/depositsLedger');

const NEW_HEADER = '| Date | Snapshot | Total value CHF | Invested CHF | Net deposited CHF | Cash CHF | Daily change CHF | Daily change % | Notes |';
const NEW_SEPARATOR = '|---|---|---:|---:|---:|---:|---:|---:|---|';

function parseArgs(argv) {
  const args = { portfolio: 'etf', dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--portfolio=')) args.portfolio = arg.slice('--portfolio='.length) || 'etf';
  }
  return args;
}

function rewriteHistory(historyPath, ledger) {
  const original = fs.readFileSync(historyPath, 'utf8');
  const lines = original.split(/\r?\n/);

  const out = [];
  let migratedRows = 0;
  let unchanged = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Header: replace if it's the legacy header.
    if (/^\|\s*Date\s*\|\s*Snapshot\s*\|/.test(trimmed)) {
      out.push(NEW_HEADER);
      continue;
    }
    // Separator: replace any row of pipes/dashes following the header.
    if (/^\|\s*-+/.test(trimmed)) {
      out.push(NEW_SEPARATOR);
      continue;
    }
    if (!trimmed.startsWith('|')) {
      out.push(line);
      continue;
    }

    const cells = trimmed.split('|').map((c) => c.trim());
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();

    // Date is first cell after leading pipe.
    const date = cells[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      out.push(line);
      continue;
    }

    const snapshot = cells[1];
    const total = cells[2];
    const invested = cells[3];
    const netDepositedCell = String(netDepositedAsOf(ledger.entries, date));

    let cash, dailyChangeChf, dailyChangePct, notes;
    if (cells.length === 8) {
      // legacy: total | invested | cash | daily | dailyPct | notes
      cash = cells[4];
      dailyChangeChf = cells[5];
      dailyChangePct = cells[6];
      notes = cells[7] || '';
      migratedRows += 1;
    } else if (cells.length >= 9) {
      // already-migrated layout: replace netDeposited cell, keep rest.
      cash = cells[5];
      dailyChangeChf = cells[6];
      dailyChangePct = cells[7];
      notes = cells.slice(8).join(' | ').trim();
      // Detect whether the existing netDeposited cell already matches.
      if (cells[4] === netDepositedCell) unchanged += 1;
      else migratedRows += 1;
    } else {
      out.push(line);
      continue;
    }

    out.push(`| ${date} | ${snapshot} | ${total} | ${invested} | ${netDepositedCell} | ${cash} | ${dailyChangeChf} | ${dailyChangePct} | ${notes} |`);
  }

  return { result: out.join('\n'), migratedRows, unchanged };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const portfolioDir = path.resolve(process.cwd(), 'portfolio', args.portfolio);
  const historyPath = path.join(portfolioDir, 'history.md');

  if (!fs.existsSync(historyPath)) {
    console.log(JSON.stringify({ ok: false, reason: 'history_not_found', historyPath }, null, 2));
    process.exit(1);
  }

  const ledger = loadDepositsLedger(portfolioDir);
  if (ledger.missing) {
    console.log(JSON.stringify({
      ok: true,
      portfolio: args.portfolio,
      attempted: false,
      reason: 'no_deposits_ledger',
      message: 'portfolio has no deposits.md; nothing to backfill.',
    }, null, 2));
    return;
  }

  const { result, migratedRows, unchanged } = rewriteHistory(historyPath, ledger);

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      portfolio: args.portfolio,
      dryRun: true,
      migratedRows,
      unchanged,
      historyPath,
    }, null, 2));
    return;
  }

  const finalText = result.endsWith('\n') ? result : `${result}\n`;
  fs.writeFileSync(historyPath, finalText);
  console.log(JSON.stringify({
    ok: true,
    portfolio: args.portfolio,
    dryRun: false,
    migratedRows,
    unchanged,
    historyPath,
  }, null, 2));
}

main();
