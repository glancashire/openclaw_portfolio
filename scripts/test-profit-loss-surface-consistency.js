"use strict";

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { collectPortfolioSummary } = require('../src/reporting/summaryArtifacts');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');
const { setQuoteServiceTransport } = require('../src/quotes');

// Invariant under test: the summary surface and the dashboard surface must
// report the same unrealized profit numbers.
//
// Two hermeticity requirements follow from that:
//
// 1. Deterministic quotes. Both surfaces resolve quotes independently, so live
//    quotes can drift between the two calls and break equality for reasons that
//    have nothing to do with the invariant. We pin the shared quote transport to
//    a deterministic stub.
//
// 2. No writes to real portfolio data. regenerateDashboard() writes dashboard.md
//    into the portfolio directory it is given. Pointing it at portfolio/etf while
//    a stub transport is installed would publish fabricated prices into live,
//    operator-visible artifacts (and into any digest email generated from them).
//    We therefore copy the portfolio inputs into a temp sandbox and run both
//    surfaces there.
function createDeterministicTransport() {
  return {
    kind: 'test_deterministic_stub',
    async getQuote({ context = {} } = {}) {
      const key = String(context.conid || context.externalSymbol || 'x');
      let hash = 0;
      for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 100000;
      const price = Number((10 + (hash % 9000) / 100).toFixed(2));
      return {
        ok: true,
        price,
        close: price,
        currency: null,
        providerPath: 'test_deterministic_stub',
        providerLabel: 'Deterministic test stub',
        quality: 'last_close',
        asOf: '2026-07-30T07:00:00.000Z',
        ageSeconds: 60,
        ageLabel: '1m',
        note: 'Deterministic stubbed quote for surface-consistency testing.',
        attempts: [],
      };
    },
    async getQuotes() { return []; },
    async getProviderHealth() { return []; },
  };
}

// Copy the portfolio's input files into an isolated sandbox directory. Only
// top-level files are copied; generated subdirectories (reports/) are not needed
// and are left behind deliberately.
function createSandboxPortfolio(sourceDir) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-surface-'));
  // Distinct basename so runtime side-artifacts keyed by portfolio name cannot
  // collide with the real 'etf' portfolio's runtime state.
  const sandboxDir = path.join(root, 'etf-plsurface-sandbox');
  fs.mkdirSync(sandboxDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    fs.copyFileSync(path.join(sourceDir, entry.name), path.join(sandboxDir, entry.name));
  }
  return { root, sandboxDir };
}

(async function main() {
  const sourceDir = path.join(__dirname, '..', 'portfolio', 'etf');
  const { root, sandboxDir } = createSandboxPortfolio(sourceDir);
  setQuoteServiceTransport(createDeterministicTransport());

  try {
    const summary = await collectPortfolioSummary({ portfolioDir: sandboxDir });
    const dashboardPath = await regenerateDashboard(sandboxDir);

    // Guard the guard: the dashboard we assert on must be the sandbox copy, so a
    // future refactor cannot silently start writing to the real portfolio again.
    assert.ok(
      path.resolve(dashboardPath).startsWith(path.resolve(root)),
      `Dashboard must be written inside the sandbox, got: ${dashboardPath}`,
    );

    const dashboard = fs.readFileSync(dashboardPath, 'utf8');
    const profitMatch = dashboard.match(/- Total unrealized profit CHF: (.+)/);
    const pctMatch = dashboard.match(/- Total unrealized profit %: (.+)/);
    assert(profitMatch, 'Expected dashboard unrealized profit line');
    assert(pctMatch, 'Expected dashboard unrealized profit pct line');

    const expectedProfit = Number(summary.profitLoss.totals.totalProfitChf || 0);
    const normalizedDashboardProfit = Number(String(profitMatch[1]).replace(/[^0-9.-]/g, ''));
    assert.strictEqual(
      Number(normalizedDashboardProfit.toFixed(2)),
      Number(expectedProfit.toFixed(2)),
      `Expected dashboard profit ${expectedProfit}, got: ${profitMatch[1]}`,
    );

    if (summary.profitLoss.totals.totalProfitPct == null) {
      assert.strictEqual(pctMatch[1], 'unknown');
    } else {
      const normalizedDashboardPct = Number(String(pctMatch[1]).replace(/[^0-9.-]/g, ''));
      const expectedPctNumeric = Number(summary.profitLoss.totals.totalProfitPct);
      assert.strictEqual(
        Number(normalizedDashboardPct.toFixed(2)),
        Number(expectedPctNumeric.toFixed(2)),
        `Expected dashboard pct ${expectedPctNumeric}, got: ${pctMatch[1]}`,
      );
    }

    const row = summary.profitLoss.rows.find((item) => item.quoteSource || item.quoteQuality || item.quoteNote);
    assert(row, 'Expected at least one profit/loss row with quote provenance');
    assert(typeof row.quoteSource === 'string' && row.quoteSource.length > 0, 'Expected quoteSource');
    assert(typeof row.quoteQuality === 'string' && row.quoteQuality.length > 0, 'Expected quoteQuality');

    console.log(JSON.stringify({
      ok: true,
      totalProfitChf: summary.profitLoss.totals.totalProfitChf,
      totalProfitPct: summary.profitLoss.totals.totalProfitPct,
      quoteSource: row.quoteSource,
      quoteQuality: row.quoteQuality,
      sandboxed: true,
    }, null, 2));
  } finally {
    setQuoteServiceTransport(null);
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
