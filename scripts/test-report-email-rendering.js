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

  assert(html.includes('Held instruments'));
  assert(html.includes('Vanguard Total World Stock ETF'));
  assert(html.includes('iShares Core SPI'));
  assert(html.includes('Average buy price'));
  assert(html.includes('Latest price'));
  assert(html.includes('Gain since purchase'));
  assert(html.includes('Next step to improve the portfolio'));
  assert(html.includes('What matters now'));
  assert(html.includes('Total held instruments'));
  assert(html.includes('Cost basis unavailable'));
  assert(html.includes('YTD unavailable'));

  const text = buildReportEmailText({
    portfolioName: 'etf',
    period: 'summary',
    summaryMarkdown: '# Details',
    summary,
    deliveryStatus: { pendingActions: [] },
    topBlocker: null,
    nextAction: summary.recommendedNextStep,
  });

  assert(text.includes('Held instruments'));
  assert(text.includes('VT — Vanguard Total World Stock ETF'));
  assert(text.includes('Average buy price: CHF 190.00'));
  assert(text.includes('Average buy price: unavailable'));
  assert(text.includes('Next step to improve the portfolio'));
  assert(text.includes('What matters now: Add gradually to the underweight global equity position while keeping some CHF cash in reserve.'));
  assert(text.includes('Total held instruments: 2'));

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

  assert(sparseHtml.includes('etf has a fresh weekly report ready'));
  assert(sparseHtml.includes('Held instruments data is not available in this sample yet.'));
  assert(!sparseHtml.includes('Supporting detail'));
  assert(sparseText.includes('etf has a fresh weekly report ready'));
  assert(sparseText.includes('Held instruments data is not available in this sample yet.'));
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
  assert(generatedText.includes("etf is worth CHF 22'209.48"));
  assert(generatedText.includes('Total held instruments: 3'));
  assert(generatedText.includes('SXR8'));

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
