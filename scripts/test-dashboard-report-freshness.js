const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-report-freshness-'));
  const portfolioDir = path.join(tempDir, 'demo');
  fs.mkdirSync(path.join(portfolioDir, 'reports'), { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: require_confirmation\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | none |\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 50 | 40 | 60 | |\n\n## Geographic Targets\n| Region | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global | 100 | 90 | 100 | |\n\n## Notes / Open Questions\n- settled\n`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 11:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 4000\n- Invested value CHF: 1000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| AAA | ETF A | Global equities | 2 | 500 | CHF | 1 | 1000 | 20 | 50 | -30 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 4000 | 1 | 4000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n- Warnings:\n - none\n`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-05 11:05:00 | submitted | buy | AAA | ETF A | 1 | 500 | 500 | 0 | note | submitted_to_broker | 123 |\n`);

  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-05 | execution_submitted | 5000 | 1000 | 4000 | 0 | 0 | Broker order 123 status sync: submitted |\n`);

  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return {
        getInteractiveBrokersReadiness: async () => ({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, message: 'healthy' }),
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');
    const { fileFreshnessSummary } = require('../src/reporting/freshness');
    const { generateAndWriteReport, formatReport } = require('../src/reporting/reportGenerator');

    const dashboardPath = await regenerateDashboard(portfolioDir);
    const dashboard = fs.readFileSync(dashboardPath, 'utf8');
    assert(dashboard.includes('## Freshness'), 'Expected dashboard freshness section');
    assert(dashboard.includes('## Delivery Status'), 'Expected dashboard delivery status section');
    assert(dashboard.includes('## Pending Operator Actions'), 'Expected dashboard pending actions section');
    assert(dashboard.includes('Dashboard stale: no'), 'Expected fresh dashboard after regeneration');

    const report = await generateAndWriteReport({ portfolioDir, period: 'weekly', dateStamp: '20260505' });
    const reportText = fs.readFileSync(report.markdownPath, 'utf8');
    assert(reportText.includes('## Freshness'), 'Expected report freshness section');
    assert(reportText.includes('## Delivery Status'), 'Expected report delivery status section');
    assert(reportText.includes('## Pending Operator Actions'), 'Expected report pending actions section');
    assert(reportText.includes('Dashboard file present: yes'), 'Expected report to mention dashboard presence');

    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(path.join(portfolioDir, 'trades.md'), future, future);
    const freshness = fileFreshnessSummary({
      dashboardPath,
      sourcePaths: [
        path.join(portfolioDir, 'portfolio.md'),
        path.join(portfolioDir, 'holdings.md'),
        path.join(portfolioDir, 'trades.md'),
        path.join(portfolioDir, 'history.md'),
      ],
    });
    assert(freshness.stale === true, 'Expected newer trades file to mark dashboard stale');

    const staleRendered = formatReport({
      portfolioName: 'demo',
      period: 'weekly',
      start: '2026-05-05',
      end: '2026-05-05',
      generated: '2026-05-05T12:00:00.000Z',
      trades: [],
      latestSnapshot: { totalValue: '5000', cash: '4000', dailyChange: '0', dailyChangePct: '0' },
      executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
      brokerReadiness: { message: 'healthy', fallbackRequired: false },
      lifecycleSummary: { submitted: 1 },
      freshness,
      deliveryStatus: {
        deliveryMode: 'local_only',
        intendedChannels: ['repo_artifacts'],
        externalDeliveryEnabled: false,
        failureAlertMode: 'local_operator_review',
        failureAlertTargets: ['dashboard'],
        overrideLoaded: true,
        ready: false,
        pendingActions: ['Dashboard/report freshness is stale relative to source state.'],
      },
      pendingActions: ['Dashboard/report freshness is stale relative to source state.'],
    });
    assert(staleRendered.includes('Dashboard stale: yes'), 'Expected stale freshness to render in report output');
    assert(staleRendered.includes('Newest source file:'), 'Expected report freshness metadata');
    assert(staleRendered.includes('Delivery readiness: needs_operator_attention'), 'Expected delivery readiness metadata');

    console.log(JSON.stringify({ ok: true, dashboardPath, report }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
