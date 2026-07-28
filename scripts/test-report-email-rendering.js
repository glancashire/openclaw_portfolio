const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildReportEmailHtml, buildReportEmailText, loadSummaryEmailSource } = require('../src/reporting/reportEmail');

(function main() {
  const summary = {
    holdings: {
      totalValueChf: 12000,
      investedChf: 10000,
      cashChf: 2000,
      holdingCount: 2,
      latestSnapshotDate: '2026-05-24',
      lastSyncAt: '2026-05-24 09:00:00',
      baseCurrency: 'CHF',
    },
    profitLoss: {
      totals: {
        totalProfitChf: 800,
        totalProfitPct: 8.0,
        totalCostBasisChf: 10000,
        coveredCount: 2,
      },
    },
    investorHoldings: {
      totals: {
        totalValueChf: 12000,
        totalGainChf: 800,
        totalGainPct: 7.3,
        rowCount: 2,
      },
      rows: [
        {
          symbol: 'VT',
          name: 'Vanguard Total World Stock ETF',
          quantityHeld: 5,
          averageBuyPrice: 190,
          lastTradedPrice: 210,
          totalValue: 1050,
          gainSincePurchasePct: 10.5,
          valueChf: 1050,
          gainSincePurchaseChf: 100,
          allocationPct: 19.8,
          targetPct: 20,
          driftPct: -0.2,
          performanceWindows: {
            sincePurchase: { availability: 'available', gainChf: 100, gainPct: 10.5 },
            last7d: { availability: 'missing_history', gainChf: null, gainPct: null },
            last30d: { availability: 'missing_history', gainChf: null, gainPct: null },
            ytd: { availability: 'missing_history', gainChf: null, gainPct: null },
            last365d: { availability: 'missing_history', gainChf: null, gainPct: null },
          },
          availability: { averageBuyPrice: 'available', gainSincePurchaseChf: 'available', ytd: 'missing_history' },
        },
        {
          symbol: 'CHSPI',
          name: 'iShares Core SPI',
          quantityHeld: 10,
          averageBuyPrice: null,
          lastTradedPrice: 98,
          totalValue: 980,
          gainSincePurchasePct: null,
          valueChf: 980,
          gainSincePurchaseChf: null,
          allocationPct: 4,
          targetPct: 6,
          driftPct: -2,
          performanceWindows: {
            sincePurchase: { availability: 'missing', gainChf: null, gainPct: null },
            last7d: { availability: 'missing_history', gainChf: null, gainPct: null },
            last30d: { availability: 'missing_history', gainChf: null, gainPct: null },
            ytd: { availability: 'missing_history', gainChf: null, gainPct: null },
            last365d: { availability: 'missing_history', gainChf: null, gainPct: null },
          },
          availability: { averageBuyPrice: 'missing', gainSincePurchaseChf: 'missing', ytd: 'missing_history' },
        },
      ],
    },
    performance: {
      portfolio: {
        windows: {
          sincePurchase: { availability: 'available', gainChf: 800, gainPct: 8.0, anchorDate: null },
          last7d: { availability: 'available', gainChf: 120, gainPct: 1.0, anchorDate: '2026-05-17' },
          last30d: { availability: 'available', gainChf: 350, gainPct: 3.0, anchorDate: '2026-04-24' },
          ytd: { availability: 'partial', gainChf: 500, gainPct: 4.3, anchorDate: '2026-01-03' },
          last365d: { availability: 'missing_history', gainChf: null, gainPct: null, anchorDate: null },
        },
      },
    },
    status: {
      health: 'healthy',
      executionPosture: 'ready',
    },
    recommendedNextStep: 'Add gradually to the underweight global equity position.',
  };

  // === HTML output ===
  const html = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'weekly',
    summaryHtml: '<p>detail</p>',
    summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: summary.recommendedNextStep,
  });

  // Block 1: Portfolio Value Snapshot
  assert(html.includes('Total portfolio value'), 'HTML has hero label');
  assert(html.includes('12&#39;000.00') || html.includes("12'000.00"), 'HTML contains total value');
  assert(html.includes('Cash'), 'HTML has cash label');
  assert(html.includes('2&#39;000.00') || html.includes("2'000.00"), 'HTML contains cash value');
  assert(html.includes('Invested'), 'HTML has invested label');
  assert(html.includes('10&#39;000.00') || html.includes("10'000.00"), 'HTML contains invested value');

  // Block 2: Profit / Loss
  assert(html.includes('Unrealized Profit'), 'HTML has profit/loss strip');
  assert(html.includes('+') || html.includes('800'), 'HTML contains profit amount');

  // Block 3: Holdings table
  assert(html.includes('Instrument'), 'HTML has Instrument column');
  assert(html.includes('Value CHF'), 'HTML has Value CHF column');
  assert(html.includes('Cost basis CHF'), 'HTML has Cost basis column');
  assert(html.includes('Since purchase'), 'HTML has since purchase column');
  assert(html.includes('7d'), 'HTML has 7d column');
  assert(html.includes('30d'), 'HTML has 30d column');
  assert(html.includes('YTD'), 'HTML has YTD column');
  assert(html.includes('365d'), 'HTML has 365d column');
  assert(html.includes('Weight %'), 'HTML has Weight % column');
  assert(html.includes('Portfolio value windows (reference only)'), 'HTML has reference value windows section');
  assert(html.includes('Last 7 days'), 'HTML has 7d window');
  assert(html.includes('Vanguard Total World Stock ETF'), 'HTML contains VT name');
  assert(html.includes('iShares Core SPI'), 'HTML contains CHSPI name');
  assert(html.includes('VT'), 'HTML contains VT symbol');
  assert(html.includes('CHSPI'), 'HTML contains CHSPI symbol');
  assert(html.includes('TOTAL'), 'HTML has sum row');

  // Should NOT contain old sections
  assert(!html.includes('Overall analysis'), 'HTML does NOT have analysis section');
  assert(!html.includes('Core recommendation'), 'HTML does NOT have recommendation');
  assert(!html.includes('Improve:'), 'HTML does NOT have Improve label');
  assert(!html.includes('Recommendation'), 'HTML does NOT have per-row recommendation column');
  assert(!html.includes('HOLD'), 'HTML does NOT have HOLD badges');
  assert(!html.includes('Holding %'), 'HTML uses Weight % not Holding %');

  // === Text output ===
  const text = buildReportEmailText({
    portfolioName: 'etf',
    period: 'weekly',
    summaryMarkdown: '# Details',
    summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: summary.recommendedNextStep,
  });

  assert(text.includes('Portfolio Value'), 'Text has portfolio value section');
  assert(text.includes("Total value: CHF 12'000.00"), 'Text has total value');
  assert(text.includes("Cash: CHF 2'000.00"), 'Text has cash');
  assert(text.includes("Invested: CHF 10'000.00"), 'Text has invested');
  assert(text.includes('Profit / Loss'), 'Text has profit/loss section');
  assert(text.includes('Portfolio value windows (reference only)'), 'Text has reference value windows section');
  assert(text.includes('Holdings'), 'Text has holdings section');
  assert(text.includes('VT'), 'Text contains VT symbol');
  assert(text.includes('CHSPI'), 'Text contains CHSPI symbol');
  assert(text.includes('TOTAL'), 'Text has sum row');
  assert(text.includes('Weight %'), 'Text has weight % header');
  assert(text.includes('Since purchase | 7d | 30d | YTD | 365d'), 'Text has gain window holding headers');
  assert(!text.includes('Core recommendation'), 'Text does NOT have recommendation');
  assert(!text.includes('Overall analysis'), 'Text does NOT have analysis');
  assert(!text.includes('Improve'), 'Text does NOT have Improve section');

  // === Sparse/empty summary ===
  const sparseSummary = {
    holdings: {},
    investorHoldings: { rows: [], totals: {} },
    status: {},
    recommendedNextStep: null,
  };

  const sparseHtml = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'weekly',
    summaryHtml: '<p>Should not render</p>',
    summary: sparseSummary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: null,
  });

  const sparseText = buildReportEmailText({
    portfolioName: 'etf',
    period: 'weekly',
    summaryMarkdown: 'Should not render',
    summary: sparseSummary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: null,
  });

  assert(sparseHtml.includes('No holdings data available'), 'Sparse HTML shows no-data message');
  assert(!sparseHtml.includes('Should not render'), 'Sparse HTML does not embed raw summary');
  assert(sparseText.includes('No holdings data available'), 'Sparse text shows no-data message');
  assert(!sparseText.includes('Should not render'), 'Sparse text does not embed raw summary');

  // === loadSummaryEmailSource ===
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'report-email-'));
  const reportMarkdownPath = path.join(tmpDir, 'portfolio_report_etf_weekly_20260524.md');
  const reportHtmlPath = path.join(tmpDir, 'portfolio_report_etf_weekly_20260524.html');
  const reportJsonPath = path.join(tmpDir, 'portfolio_report_etf_weekly_20260524.json');
  const generatedSummary = {
    holdings: {
      totalValueChf: 22209.48,
      investedChf: 22209.48,
      cashChf: 0,
      holdingCount: 3,
      latestSnapshotDate: '2026-05-23',
    },
    profitLoss: {
      totals: { totalProfitChf: -120.50, totalProfitPct: -0.54, totalCostBasisChf: 22330, coveredCount: 3 },
    },
    investorHoldings: {
      rows: [
        { symbol: 'SXR8', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', quantityHeld: 18, valueChf: 12439.53, gainSincePurchaseChf: 50, gainSincePurchasePct: 0.4, performanceWindows: { sincePurchase: { availability: 'available', gainChf: 50, gainPct: 0.4 }, last7d: { availability: 'missing_history' }, last30d: { availability: 'missing_history' }, ytd: { availability: 'missing_history' }, last365d: { availability: 'missing_history' } } },
        { symbol: 'EMUAA', name: 'UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc', quantityHeld: 151, valueChf: 6052.12, gainSincePurchaseChf: -100, gainSincePurchasePct: -1.6, performanceWindows: { sincePurchase: { availability: 'available', gainChf: -100, gainPct: -1.6 }, last7d: { availability: 'missing_history' }, last30d: { availability: 'missing_history' }, ytd: { availability: 'missing_history' }, last365d: { availability: 'missing_history' } } },
        { symbol: 'CHSPI', name: 'UBS SLI ETF (SMI gleichgewichtet)', quantityHeld: 23, valueChf: 3717.83, gainSincePurchaseChf: -70, gainSincePurchasePct: -1.9, performanceWindows: { sincePurchase: { availability: 'available', gainChf: -70, gainPct: -1.9 }, last7d: { availability: 'missing_history' }, last30d: { availability: 'missing_history' }, ytd: { availability: 'missing_history' }, last365d: { availability: 'missing_history' } } },
      ],
      totals: { rowCount: 3, totalValueChf: 22209.48, totalGainChf: -120 },
    },
    performance: { portfolio: { windows: { sincePurchase: { availability: 'available', gainChf: -120.5, gainPct: -0.54 }, last7d: { availability: 'missing_history' }, last30d: { availability: 'missing_history' }, ytd: { availability: 'missing_history' }, last365d: { availability: 'missing_history' } } } },
    status: { health: 'attention_needed' },
    recommendedNextStep: 'Review the current dry-run proposal set.',
  };
  fs.writeFileSync(reportMarkdownPath, '# sample report\n');
  fs.writeFileSync(reportHtmlPath, '<p>sample report</p>');
  fs.writeFileSync(reportJsonPath, JSON.stringify(generatedSummary, null, 2));

  const loaded = loadSummaryEmailSource({ summaryPath: reportMarkdownPath, summaryHtmlPath: reportHtmlPath });
  assert.strictEqual(loaded.summary.holdings.totalValueChf, 22209.48);
  assert.strictEqual(loaded.summary.investorHoldings.rows.length, 3);
  assert.strictEqual(loaded.summary.investorHoldings.rows[0].symbol, 'SXR8');

  const generatedHtml = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'weekly',
    summaryHtml: loaded.summaryHtml,
    summary: loaded.summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: loaded.summary.recommendedNextStep,
  });
  const generatedText = buildReportEmailText({
    portfolioName: 'etf',
    period: 'weekly',
    summaryMarkdown: loaded.summaryMarkdown,
    summary: loaded.summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: loaded.summary.recommendedNextStep,
  });

  assert(generatedHtml.includes('22&#39;209.48') || generatedHtml.includes("22'209.48"), 'Generated HTML has total value');
  assert(generatedHtml.includes('SXR8'), 'Generated HTML has SXR8');
  assert(generatedHtml.includes('EMUAA'), 'Generated HTML has EMUAA');
  assert(generatedHtml.includes('TOTAL'), 'Generated HTML has sum row');
  assert(generatedText.includes("22'209.48"), 'Generated text has total value');
  assert(generatedText.includes('SXR8'), 'Generated text has SXR8');
  assert(generatedText.includes('TOTAL'), 'Generated text has sum row');
  assert(generatedText.includes('Weight %'), 'Generated text has weight column');

  // Profit/loss direction: negative
  assert(generatedHtml.includes('#991b1b') || generatedHtml.includes('991b1b'), 'Negative profit uses red color');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
