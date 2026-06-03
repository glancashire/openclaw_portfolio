#!/usr/bin/env node
'use strict';

/**
 * import-ibkr-deposits.js
 *
 * Reads a fresh IBKR transactions XLS, dedups against existing references in
 * portfolio/<name>/deposits.md, and appends only new deposits.
 *
 * Usage:
 *   node scripts/import-ibkr-deposits.js --portfolio=etf --xls=/path/to/transactions.xls
 *   node scripts/import-ibkr-deposits.js --portfolio=etf --xls=/path/to/transactions.xls --dry-run
 *
 * Domain: reporting / migration
 */

const fs = require('fs');
const path = require('path');
const { parseDepositXls } = require('../lib/ibkrDepositXls');
const { loadDepositsLedger } = require('../lib/depositsLedger');

function parseArgs(argv) {
  const args = { portfolio: 'etf', xls: null, dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--portfolio=')) args.portfolio = arg.slice('--portfolio='.length) || 'etf';
    else if (arg.startsWith('--xls=')) args.xls = arg.slice('--xls='.length) || null;
  }
  if (!args.xls) {
    throw new Error('--xls=<path> is required');
  }
  return args;
}

function rebuildLedgerFile(originalText, allEntriesSorted) {
  // Rebuild the "## Ledger" table and "## Totals (computed)" block from
  // the merged entry set; preserve the rest of the file.
  const headerLines = [
    '| Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |',
    '|---|---|---|---:|---:|---:|---|---|---|',
  ];
  const tableLines = allEntriesSorted.map((e) => {
    const amountNative = Number.isFinite(e.amountNative) ? e.amountNative.toFixed(2) : '';
    const fx = Number.isFinite(e.fxToChf) ? String(e.fxToChf) : '';
    const amountChf = Number.isFinite(e.amountChf) ? e.amountChf.toFixed(2) : '';
    return `| ${e.date} | ${e.direction} | ${e.currency} | ${amountNative} | ${fx} | ${amountChf} | ${e.method} | ${e.reference} | ${e.notes || ''} |`;
  });

  let totalDep = 0;
  let totalWith = 0;
  for (const e of allEntriesSorted) {
    if (e.direction === 'deposit') totalDep += Number(e.amountChf || 0);
    else if (e.direction === 'withdrawal') totalWith += Number(e.amountChf || 0);
  }
  const net = (totalDep - totalWith).toFixed(2);
  const today = new Date().toISOString().slice(0, 10);
  const totalsBlock = [
    '## Totals (computed)',
    '',
    `- Cumulative deposits CHF: **${totalDep.toFixed(2)}**`,
    `- Cumulative withdrawals CHF: **${totalWith.toFixed(2)}**`,
    `- **Net deposited CHF: ${net}**`,
    `- Last update: ${today} (auto-imported via scripts/import-ibkr-deposits.js)`,
  ].join('\n');

  // Replace the Ledger table block and the Totals block.
  let out = originalText;

  const ledgerSplit = out.match(/^([\s\S]*?##\s+Ledger\s*\n)([\s\S]*?)(?=\n##\s|$)/);
  if (ledgerSplit) {
    out = ledgerSplit[1] + '\n' + headerLines.concat(tableLines).join('\n') + '\n\n' + out.slice(ledgerSplit[0].length).replace(/^\s*\n/, '');
  } else {
    // No "## Ledger" section; append one.
    out = out.trimEnd() + '\n\n## Ledger\n\n' + headerLines.concat(tableLines).join('\n') + '\n';
  }

  // Replace or append the totals block.
  if (/##\s+Totals\s*\(computed\)/.test(out)) {
    out = out.replace(/##\s+Totals\s*\(computed\)[\s\S]*?(?=\n##\s|$)/, totalsBlock + '\n');
  } else {
    out = out.trimEnd() + '\n\n' + totalsBlock + '\n';
  }

  return out.endsWith('\n') ? out : out + '\n';
}

function importDeposits({ portfolioDir, xlsPath, dryRun = false }) {
  const ledgerPath = path.join(portfolioDir, 'deposits.md');
  const existing = loadDepositsLedger(portfolioDir);
  const knownRefs = new Set(existing.entries.map((e) => e.reference));

  const incoming = parseDepositXls(xlsPath);
  const added = [];
  const skipped = [];
  for (const row of incoming) {
    if (!row.reference) continue;
    if (knownRefs.has(row.reference)) {
      skipped.push(row);
    } else {
      added.push(row);
    }
  }

  const merged = existing.entries.concat(added);
  merged.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const summary = {
    portfolio: path.basename(portfolioDir),
    xls: xlsPath,
    incomingCount: incoming.length,
    existingCount: existing.entries.length,
    added: added.length,
    skipped: skipped.length,
    addedReferences: added.map((e) => e.reference),
    dryRun,
  };

  if (dryRun) return summary;
  if (!added.length) return summary;
  if (!fs.existsSync(ledgerPath)) {
    throw new Error(`expected ${ledgerPath} to exist; create it before importing`);
  }
  const original = fs.readFileSync(ledgerPath, 'utf8');
  const updated = rebuildLedgerFile(original, merged);
  fs.writeFileSync(ledgerPath, updated);
  return summary;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }

  const portfolioDir = path.resolve(process.cwd(), 'portfolio', args.portfolio);
  if (!fs.existsSync(portfolioDir)) {
    console.log(JSON.stringify({ ok: false, reason: 'portfolio_not_found', portfolioDir }, null, 2));
    process.exit(1);
  }

  try {
    const summary = importDeposits({
      portfolioDir,
      xlsPath: path.resolve(args.xls),
      dryRun: args.dryRun,
    });
    console.log(JSON.stringify({ ok: true, ...summary }, null, 2));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { importDeposits, rebuildLedgerFile };
