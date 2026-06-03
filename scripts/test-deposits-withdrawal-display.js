#!/usr/bin/env node
'use strict';

/**
 * test-deposits-withdrawal-display
 *
 * Verifies that buildReportEmailHtml/Text and dashboardDigest's headline card
 * surface explicit Deposits / Withdrawals / Net stack when the ledger has
 * any withdrawal entries.
 *
 * Domain: reporting
 * Lane: safe
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const { buildReportEmailHtml, buildReportEmailText } = require('../src/reporting/reportEmail');

function makeFixture(tmpRoot, ledgerLines) {
  const portfolioDir = path.join(tmpRoot, 'portfolio', 'fixture');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'deposits.md'), `# Deposits: fixture

## Ledger

| Date | Direction | Currency | Amount native | FX to CHF | Amount CHF | Method | Reference | Notes |
|---|---|---|---:|---:|---:|---|---|---|
${ledgerLines.join('\n')}
`);
  return portfolioDir;
}

function summary(totalValue) {
  return {
    holdings: { totalValueChf: totalValue, cashChf: 100, investedChf: totalValue - 100 },
    profitLoss: { totals: { totalProfitChf: 50, totalProfitPct: 0.5 }, rows: [] },
  };
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'withdraw-display-'));
  try {
    // ---- 1. ledger with both deposit + withdrawal ----
    const portfolioDir = makeFixture(tmp, [
      '| 2026-01-15 | deposit | CHF | 10000.00 | 1 | 10000.00 | bank_transfer | DEP-A | |',
      '| 2026-02-01 | deposit | CHF | 5000.00 | 1 | 5000.00 | bank_transfer | DEP-B | |',
      '| 2026-03-01 | withdrawal | CHF | 2000.00 | 1 | 2000.00 | bank_transfer | OUT-A | partial |',
    ]);
    const html = buildReportEmailHtml({ portfolioName: 'fixture', period: 'Daily', summaryHtml: '', summary: summary(15000), portfolioDir });
    const text = buildReportEmailText({ portfolioName: 'fixture', period: 'Daily', summaryMarkdown: '', summary: summary(15000), portfolioDir });

    // hero shows Net deposited 13,000 with deposits/withdrawals breakdown.
    assert(html.includes('Net deposited'), 'hero label is Net deposited');
    // CHF amounts are formatted with apostrophe thousands separator that gets HTML-escaped to &#39;
    const stripPunct = (s) => s.replace(/&#39;/g, "'").replace(/[\s']/g, '');
    const htmlNoPunct = stripPunct(html);
    assert(htmlNoPunct.includes('CHF13000.00'), 'hero shows net 13000');
    assert(htmlNoPunct.includes('DepositsCHF15000.00'), 'breakdown shows deposits 15000');
    assert(htmlNoPunct.includes('WithdrawalsCHF2000.00'), 'breakdown shows withdrawals 2000');

    // text shows two lines
    assert(text.includes('Net deposited:'), 'text has Net deposited');
    const textNoPunct = stripPunct(text);
    assert(textNoPunct.includes('Netdeposited:CHF13000.00'), 'text net 13000');
    assert(textNoPunct.includes('(DepositsCHF15000.00,WithdrawalsCHF2000.00)'), 'text breakdown line');

    // ---- 2. ledger with deposits only \u2014 backward-compatible path ----
    const portfolioDir2 = makeFixture(path.join(tmp, 'b'), [
      '| 2026-01-15 | deposit | CHF | 10000.00 | 1 | 10000.00 | bank_transfer | DEP-A | |',
    ]);
    const html2 = buildReportEmailHtml({ portfolioName: 'fixture', period: 'Daily', summaryHtml: '', summary: summary(11000), portfolioDir: portfolioDir2 });
    const text2 = buildReportEmailText({ portfolioName: 'fixture', period: 'Daily', summaryMarkdown: '', summary: summary(11000), portfolioDir: portfolioDir2 });
    assert(html2.includes('Net deposited'), 'no-withdrawal hero still labels Net deposited');
    assert(!html2.includes('Withdrawals'), 'no-withdrawal hero omits Withdrawals breakdown');
    assert(!text2.includes('Withdrawals'), 'text omits withdrawals when none');

    console.log(JSON.stringify({ ok: true }));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
