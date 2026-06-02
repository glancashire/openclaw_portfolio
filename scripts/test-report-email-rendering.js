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
          ytdPct: 4.2,
          valueChf: 1050,
          gainSincePurchaseChf: 100,
          allocationPct: 19.8,
          targetPct: 20,
          driftPct: -0.2,
          availability: { averageBuyPrice: 'available', gainSincePurchaseChf: 'available', ytd: 'available' },
        },
        {
          symbol: 'CHSPI',
          name: 'iShares Core SPI',
          quantityHeld: 10,
          averageBuyPrice: null,
          lastTradedPrice: 98,
          totalValue: 980,
          gainSincePurchasePct: null,
          ytdPct: null,
          valueChf: 980,
          gainSincePurchaseChf: null,
          allocationPct: 4,
          targetPct: 6,
          driftPct: -2,
          availability: { averageBuyPrice: 'missing', gainSincePurchaseChf: 'missing', ytd: 'missing' },
        },
      ],
    },
    status: {
      health: 'healthy',
      executionPosture: 'ready',
      brokerHealth: 'ready',
      brokerMessage: 'Broker connectivity healthy',
    },
    recommendedNextStep: 'Add gradually to the underweight global equity position while keeping some CHF cash in reserve.',
  };

  const html = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'summary',
    summaryHtml: '<p>detail</p>',
    summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: summary.recommendedNextStep,
  });

  assert(html.includes('Holdings'));
  assert(html.includes('Vanguard Total World Stock ETF'));
  assert(html.includes('iShares Core SPI'));
  assert(html.includes('Value CHF'));
  assert(html.includes('Avg. cost CHF'));
  assert(html.includes('Gain CHF'));
  assert(html.includes('Gain %'));
  assert(html.includes('Holding %'));
  assert(html.includes('Recommendation'));
  assert(html.includes('Overall analysis'));
  assert(html.includes('Improve:'));
  assert(html.includes('Risks:'));
  assert(html.includes('Opportunities:'));
  assert(html.includes('HOLD'));
  assert(html.includes('BUY'));

  const text = buildReportEmailText({
    portfolioName: 'etf',
    period: 'summary',
    summaryMarkdown: '# Details',
    summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: summary.recommendedNextStep,
  });

  assert(text.includes('Holdings'));
  assert(text.includes('VT — Vanguard Total World Stock ETF'));
  assert(text.includes('Value CHF: CHF 1\'050.00'));
  assert(text.includes('Avg. cost CHF: CHF 950.00'));
  assert(text.includes('Avg. cost CHF: —'));
  assert(text.includes('Core recommendation: Add gradually to CHSPI with fresh cash while leaving the rest unchanged.'));
  assert(text.includes('Recommendation: HOLD'));
  assert(text.includes('Recommendation: BUY'));
  assert(text.includes('Holdings count: 2'));
  assert(text.includes('Holdings value: CHF 12\'000.00'));

  const lowCashSummary = {
    ...summary,
    holdings: {
      ...summary.holdings,
      cashChf: 150,
    },
    status: {
      ...summary.status,
      health: 'attention_needed',
    },
    recommendedNextStep: null,
  };

  const lowCashText = buildReportEmailText({
    portfolioName: 'etf',
    period: 'summary',
    summaryMarkdown: '# Details',
    summary: lowCashSummary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: null,
  });

  assert(lowCashText.includes('Core recommendation: Hold current positions; rebuild cash before adding more equity risk.'));
  assert(!lowCashText.includes('Recommendation: BUY'));

  const sparseSummary = {
    holdings: {},
    investorHoldings: { rows: [], totals: {} },
    status: {},
    recommendedNextStep: null,
  };

  const sparseHtml = buildReportEmailHtml({
    portfolioName: 'etf',
    period: 'weekly',
    summaryHtml: '<p>Should not render in investor email</p>',
    summary: sparseSummary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: null,
  });

  const sparseText = buildReportEmailText({
    portfolioName: 'etf',
    period: 'weekly',
    summaryMarkdown: 'Should not render in investor email',
    summary: sparseSummary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: null,
  });

  assert(sparseHtml.includes('Current value'));
  assert(sparseHtml.includes('Holdings data is not available yet.'));
  assert(!sparseHtml.includes('Supporting detail'));
  assert(sparseText.includes('Current value: —'));
  assert(sparseText.includes('Holdings data is not available yet.'));
  assert(!sparseText.includes('Supporting detail'));
  assert(!sparseText.includes('Should not render in investor email'));

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
    investorHoldings: {
      rows: [
        { symbol: 'SXR8', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)', quantityHeld: 18, valueChf: 12439.53, currency: 'EUR' },
        { symbol: 'EMUAA', name: 'UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc', quantityHeld: 151, valueChf: 6052.12, currency: 'EUR' },
        { symbol: 'CHSPI', name: 'UBS SLI ETF (SMI gleichgewichtet)', quantityHeld: 23, valueChf: 3717.83, currency: 'CHF' },
      ],
      totals: {
        rowCount: 3,
        totalValueChf: 22209.48,
        totalGainChf: null,
      },
    },
    status: {
      health: 'attention_needed',
      executionPosture: 'ready_for_review',
    },
    recommendedNextStep: 'Review the current dry-run proposal set.',
    topBlocker: 'No urgent blocker surfaced.',
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
    topBlocker: loaded.summary.topBlocker,
    nextAction: loaded.summary.recommendedNextStep,
  });
  const generatedText = buildReportEmailText({
    portfolioName: 'etf',
    period: 'weekly',
    summaryMarkdown: loaded.summaryMarkdown,
    summary: loaded.summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: loaded.summary.topBlocker,
    nextAction: loaded.summary.recommendedNextStep,
  });

  assert(generatedHtml.includes('22&#39;209.48'));
  assert(generatedHtml.includes('SXR8'));
  assert(generatedHtml.includes('EMUAA'));
  assert(generatedText.includes("Current value: CHF 22'209.48"));
  assert(generatedText.includes('Holdings count: 3'));
  assert(generatedText.includes('Holdings value: CHF 22\'209.48'));
  assert(generatedText.includes('SXR8'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
