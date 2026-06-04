'use strict';

/**
 * Test: scripts/process-ibkr-statement-inbox.js
 *
 * Strategy: we don't have a real IBKR XLS to parse and the parser shells
 * out to Python xlrd. So we stub the underlying importDeposits() by
 * monkey-patching require.cache for './import-ibkr-deposits' inside an
 * isolated module load.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok --', label);
  asserted++;
}

const SCRIPT_PATH = path.resolve(__dirname, 'process-ibkr-statement-inbox.js');

function loadFresh(stubResults) {
  // Clear caches
  delete require.cache[SCRIPT_PATH];
  delete require.cache[path.resolve(__dirname, 'import-ibkr-deposits.js')];

  // Stub import-ibkr-deposits before loading the script under test.
  const stubPath = path.resolve(__dirname, 'import-ibkr-deposits.js');
  require.cache[stubPath] = {
    id: stubPath,
    filename: stubPath,
    loaded: true,
    exports: {
      importDeposits: ({ xlsPath }) => {
        const stub = stubResults[path.basename(xlsPath)];
        if (!stub) throw new Error(`no stub for ${path.basename(xlsPath)}`);
        if (stub.throw) throw new Error(stub.throw);
        return stub;
      },
    },
  };

  return require(SCRIPT_PATH);
}

function makePortfolioDir(root) {
  const dir = path.join(root, 'portfolio', 'etf');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'deposits.md'), '# Deposits\n\n## Ledger\n\n');
  return dir;
}

function makeFakeXls(inboxDir, name) {
  fs.mkdirSync(inboxDir, { recursive: true });
  const p = path.join(inboxDir, name);
  fs.writeFileSync(p, 'fake xls bytes');
  return p;
}

// ── Empty inbox is a clean no-op ──────────────────────────────────────────────
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-empty-'));
  const portfolioDir = makePortfolioDir(root);
  const inboxDir = path.join(root, 'inbox');
  const archiveDir = path.join(root, 'archive');
  const { processInbox } = loadFresh({});
  const r = processInbox({ portfolioDir, inboxDir, archiveDir });
  ok('empty: scanned=0', r.scanned === 0);
  ok('empty: imported=0', r.imported === 0);
  ok('empty: errors=[]', r.errors.length === 0);
  ok('empty: inbox dir was created', fs.existsSync(inboxDir));
}

// ── One valid file: imports rows + moves to archive ───────────────────────────
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-one-'));
  const portfolioDir = makePortfolioDir(root);
  const inboxDir = path.join(root, 'inbox');
  const archiveDir = path.join(root, 'archive');
  makeFakeXls(inboxDir, 'transactions-2026-06-04.xls');
  const { processInbox } = loadFresh({
    'transactions-2026-06-04.xls': { added: 3, skipped: 0 },
  });
  const r = processInbox({ portfolioDir, inboxDir, archiveDir });
  ok('one: scanned=1', r.scanned === 1);
  ok('one: imported=3', r.imported === 3);
  ok('one: file moved out of inbox', !fs.existsSync(path.join(inboxDir, 'transactions-2026-06-04.xls')));
  ok('one: file in archive', fs.existsSync(path.join(archiveDir, 'transactions-2026-06-04.xls')));
  ok('one: file result records archive path', r.files[0].archived && r.files[0].archived.includes('archive'));
}

// ── Dry run: imports nothing, leaves file in inbox ────────────────────────────
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-dry-'));
  const portfolioDir = makePortfolioDir(root);
  const inboxDir = path.join(root, 'inbox');
  const archiveDir = path.join(root, 'archive');
  const xlsPath = makeFakeXls(inboxDir, 'transactions-dry.xls');
  const { processInbox } = loadFresh({
    'transactions-dry.xls': { added: 5, skipped: 0, dryRun: true },
  });
  const r = processInbox({ portfolioDir, inboxDir, archiveDir, dryRun: true });
  ok('dry: scanned=1', r.scanned === 1);
  ok('dry: imported still reflects stub return', r.imported === 5);
  ok('dry: file NOT moved', fs.existsSync(xlsPath));
  ok('dry: archive not populated', !fs.existsSync(path.join(archiveDir, 'transactions-dry.xls')));
  ok('dry: file result has no archived field set', r.files[0].archived === null);
}

// ── Duplicate file (all rows skipped) still archives ──────────────────────────
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-dup-'));
  const portfolioDir = makePortfolioDir(root);
  const inboxDir = path.join(root, 'inbox');
  const archiveDir = path.join(root, 'archive');
  makeFakeXls(inboxDir, 'transactions-dup.xls');
  const { processInbox } = loadFresh({
    'transactions-dup.xls': { added: 0, skipped: 7 },
  });
  const r = processInbox({ portfolioDir, inboxDir, archiveDir });
  ok('dup: scanned=1', r.scanned === 1);
  ok('dup: imported=0', r.imported === 0);
  ok('dup: skipped=7', r.skipped === 7);
  ok('dup: still moved to archive (avoid reprocessing)', fs.existsSync(path.join(archiveDir, 'transactions-dup.xls')));
}

// ── Parser throws: error captured, file NOT archived ──────────────────────────
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-bad-'));
  const portfolioDir = makePortfolioDir(root);
  const inboxDir = path.join(root, 'inbox');
  const archiveDir = path.join(root, 'archive');
  const xlsPath = makeFakeXls(inboxDir, 'malformed.xls');
  const { processInbox } = loadFresh({
    'malformed.xls': { throw: 'xlrd: bad magic number' },
  });
  const r = processInbox({ portfolioDir, inboxDir, archiveDir });
  ok('bad: scanned=1', r.scanned === 1);
  ok('bad: imported=0', r.imported === 0);
  ok('bad: errors length=1', r.errors.length === 1);
  ok('bad: error message contains xlrd', r.errors[0].error.includes('xlrd'));
  ok('bad: file kept in inbox for human review', fs.existsSync(xlsPath));
  ok('bad: archive empty', !fs.existsSync(archiveDir) || fs.readdirSync(archiveDir).length === 0);
}

// ── Archive collision: appends timestamp ──────────────────────────────────────
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-collide-'));
  const portfolioDir = makePortfolioDir(root);
  const inboxDir = path.join(root, 'inbox');
  const archiveDir = path.join(root, 'archive');
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, 'transactions.xls'), 'pre-existing');
  makeFakeXls(inboxDir, 'transactions.xls');
  const { processInbox } = loadFresh({
    'transactions.xls': { added: 1, skipped: 0 },
  });
  const r = processInbox({ portfolioDir, inboxDir, archiveDir });
  ok('collision: imported=1', r.imported === 1);
  ok('collision: original archive file preserved', fs.readFileSync(path.join(archiveDir, 'transactions.xls'), 'utf8') === 'pre-existing');
  const archived = fs.readdirSync(archiveDir);
  const renamed = archived.find((n) => n !== 'transactions.xls' && n.startsWith('transactions.') && n.endsWith('.xls'));
  ok('collision: new file got timestamp suffix', !!renamed);
}

// ── Multi-file processing in lex order ────────────────────────────────────────
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inbox-multi-'));
  const portfolioDir = makePortfolioDir(root);
  const inboxDir = path.join(root, 'inbox');
  const archiveDir = path.join(root, 'archive');
  makeFakeXls(inboxDir, 'b-second.xls');
  makeFakeXls(inboxDir, 'a-first.xls');
  const callOrder = [];
  delete require.cache[SCRIPT_PATH];
  delete require.cache[path.resolve(__dirname, 'import-ibkr-deposits.js')];
  const stubPath = path.resolve(__dirname, 'import-ibkr-deposits.js');
  require.cache[stubPath] = {
    id: stubPath,
    filename: stubPath,
    loaded: true,
    exports: {
      importDeposits: ({ xlsPath }) => {
        callOrder.push(path.basename(xlsPath));
        return { added: 1, skipped: 0 };
      },
    },
  };
  const { processInbox } = require(SCRIPT_PATH);
  const r = processInbox({ portfolioDir, inboxDir, archiveDir });
  ok('multi: scanned=2', r.scanned === 2);
  ok('multi: imported=2', r.imported === 2);
  ok('multi: lexical order', callOrder.join(',') === 'a-first.xls,b-second.xls');
}

console.log('\nibkr-statement-inbox tests: ' + asserted + ' assertions passed');
