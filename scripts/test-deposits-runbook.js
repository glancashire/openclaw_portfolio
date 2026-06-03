#!/usr/bin/env node
'use strict';

/* Regression test for Phase G4: docs/operator-runbooks.md must carry the
 * deposits-ledger lifecycle section so future operators have a single
 * authoritative reference. The check pins the section heading + key
 * cross-references rather than full prose, so editorial polish stays
 * possible without breaking the test.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const RUNBOOK_PATH = path.resolve(__dirname, '..', 'docs', 'operator-runbooks.md');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const md = fs.readFileSync(RUNBOOK_PATH, 'utf8');

test('runbook contains the Deposits ledger section', () => {
  assert(/^## Deposits ledger\b/m.test(md), 'expected "## Deposits ledger" section heading');
});

test('runbook references the per-portfolio file path', () => {
  assert(md.includes('portfolio/<name>/deposits.md'), 'expected portfolio/<name>/deposits.md reference');
});

test('runbook references the auto-import CLI + dry-run flag', () => {
  assert(md.includes('scripts/import-ibkr-deposits.js'), 'expected scripts/import-ibkr-deposits.js reference');
  assert(md.includes('--dry-run'), 'expected --dry-run mention for the auto-import flow');
});

test('runbook references the depositsLedger parser module', () => {
  assert(md.includes('lib/depositsLedger.js'), 'expected lib/depositsLedger.js reference');
});

test('runbook explains the pending_ibkr_xls backfill convention', () => {
  assert(md.includes('pending_ibkr_xls'), 'expected pending_ibkr_xls convention reference');
  assert(/(backfill|swap the placeholder|in place)/i.test(md), 'expected explicit backfill guidance prose');
});

test('runbook lists the downstream surfaces fed by the ledger', () => {
  assert(md.includes('Net deposited CHF'), 'expected reference to Net deposited CHF column in history.md');
  assert(/Total return\b/.test(md), 'expected Total return reference (digest hero)');
});

test('runbook subsections cover all required lifecycle steps', () => {
  const required = [
    'Use when',
    'File contract',
    'Manual append flow',
    'Auto-import CLI',
    '`pending_ibkr_xls` backfill convention',
    'Downstream surfaces',
    'Verification after editing',
  ];
  for (const heading of required) {
    assert(md.includes(heading), `expected subsection or label "${heading}"`);
  }
});

console.log(JSON.stringify({ ok: true, passed }, null, 2));
