#!/usr/bin/env node
'use strict';

/**
 * process-ibkr-statement-inbox.js
 *
 * Scans an inbox directory for IBKR statement XLS files, imports each one
 * via importDeposits(), and moves processed files to an archive directory.
 *
 * Designed to be a perfect no-op when the inbox is empty so it can be wired
 * into the daily-sync cron without depending on an XLS being present.
 *
 * Usage:
 *   node scripts/process-ibkr-statement-inbox.js --portfolio=etf
 *   node scripts/process-ibkr-statement-inbox.js --portfolio=etf --dry-run
 *   node scripts/process-ibkr-statement-inbox.js --portfolio=etf --inbox=/tmp/in --archive=/tmp/done
 *
 * Exit codes:
 *   0 — inbox empty OR all files processed (incl. duplicates, no error)
 *   1 — hard error (e.g. portfolio dir missing, write failure on a file
 *       that already started being processed)
 */

const fs = require('fs');
const path = require('path');
const { importDeposits } = require('./import-ibkr-deposits');

const DEFAULT_INBOX_REL = path.join('runtime', 'ibkr-statements', 'inbox');
const DEFAULT_ARCHIVE_REL = path.join('runtime', 'ibkr-statements', 'archive');
const XLS_EXTENSIONS = new Set(['.xls', '.xlsx']);

function parseArgs(argv) {
  const args = { portfolio: 'etf', inbox: null, archive: null, dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--portfolio=')) args.portfolio = arg.slice('--portfolio='.length) || 'etf';
    else if (arg.startsWith('--inbox=')) args.inbox = arg.slice('--inbox='.length) || null;
    else if (arg.startsWith('--archive=')) args.archive = arg.slice('--archive='.length) || null;
  }
  return args;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function listXlsFiles(inboxDir) {
  if (!fs.existsSync(inboxDir)) return [];
  return fs.readdirSync(inboxDir)
    .filter((name) => XLS_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(inboxDir, name))
    .filter((p) => {
      try { return fs.statSync(p).isFile(); } catch { return false; }
    })
    .sort();
}

function archiveFile(filePath, archiveDir) {
  ensureDir(archiveDir);
  const base = path.basename(filePath);
  let target = path.join(archiveDir, base);
  if (fs.existsSync(target)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(base);
    const stem = base.slice(0, base.length - ext.length);
    target = path.join(archiveDir, `${stem}.${ts}${ext}`);
  }
  fs.renameSync(filePath, target);
  return target;
}

function processInbox({ portfolioDir, inboxDir, archiveDir, dryRun = false }) {
  const result = {
    portfolioDir,
    inboxDir,
    archiveDir,
    dryRun,
    scanned: 0,
    imported: 0,
    skipped: 0,
    errors: [],
    files: [],
  };

  ensureDir(inboxDir);
  const files = listXlsFiles(inboxDir);
  result.scanned = files.length;
  if (!files.length) return result;

  for (const filePath of files) {
    const fileResult = { file: path.basename(filePath), added: 0, skipped: 0, error: null, archived: null };
    try {
      const summary = importDeposits({ portfolioDir, xlsPath: filePath, dryRun });
      fileResult.added = summary.added || 0;
      fileResult.skipped = summary.skipped || 0;
      result.imported += fileResult.added;
      result.skipped += fileResult.skipped;

      if (!dryRun) {
        fileResult.archived = archiveFile(filePath, archiveDir);
      }
    } catch (err) {
      fileResult.error = err.message || String(err);
      result.errors.push({ file: fileResult.file, error: fileResult.error });
    }
    result.files.push(fileResult);
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const portfolioDir = path.resolve(repoRoot, 'portfolio', args.portfolio);
  if (!fs.existsSync(portfolioDir)) {
    console.log(JSON.stringify({ ok: false, reason: 'portfolio_not_found', portfolioDir }, null, 2));
    process.exit(1);
  }
  const inboxDir = path.resolve(repoRoot, args.inbox || DEFAULT_INBOX_REL);
  const archiveDir = path.resolve(repoRoot, args.archive || DEFAULT_ARCHIVE_REL);

  const result = processInbox({ portfolioDir, inboxDir, archiveDir, dryRun: args.dryRun });
  const ok = result.errors.length === 0;
  console.log(JSON.stringify({ ok, ...result }, null, 2));
  process.exit(ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = { processInbox, listXlsFiles, archiveFile };
