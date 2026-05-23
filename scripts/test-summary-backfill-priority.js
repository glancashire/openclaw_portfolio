const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '../brokers/interactive-brokers/readiness') {
    return {
      getInteractiveBrokersReadiness: async () => ({
        ok: true,
        configured: true,
        authenticated: true,
        fallbackRequired: false,
        message: 'Broker readiness healthy.',
      }),
    };
  }
  if (request === '../execution/runtimeState') {
    return {
      brokerErrorStatus: () => ({ stopAutomation: false, consecutive: 0, lastError: null }),
    };
  }
  return originalLoad(request, parent, isMain);
};

const { generatePortfolioSummaryArtifacts } = require('../src/reporting/summaryArtifacts');
Module._load = originalLoad;

(async function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-backfill-priority-'));
  const portfolioDir = path.join(repoRoot, 'portfolio', 'etf');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({
    deliveryMode: 'email_and_repo',
    externalDeliveryEnabled: true,
    emailProvider: 'mailgun',
    emailRecipients: ['lancashire@swift.ch'],
    pendingActionThresholds: {
      staleDashboard: false,
      failedTrades: 99,
      inFlightOrders: 99,
      brokerAutomationPaused: false,
    },
  }, null, 2));

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: etf
- Status: active
- Execution mode: require_confirmation
- Broker account reference: TEST123

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 60 | 50 | 70 | Broad developed-market ETF |
| Swiss equities | 20 | 10 | 30 | CHF exposure |
| Bonds / cash-like | 20 | 10 | 30 | CHF cash |

## Market Entry Policy
- Initial deployment mode: staged
- Deployment period: 10
- Max daily deployment: 10%
- Avoid buying after extreme daily price moves: true
- Use limit orders where supported: true
- Require confirmation before first live trade: true

## Risk Limits
- Max single ETF allocation: 50%
- Max single issuer allocation: 60%
- Max equity allocation: 80%
- Max bond duration: n/a
- Max cash drag after full deployment: 25%
- Stop trading if portfolio value drops by: 20% over 30 calendar days
- Stop trading if broker/API errors occur: true

## Broker Access
- Broker adapter: interactive-brokers
- Credentials source: environment variables or secret store only
- Never store API keys in Markdown: true
- Account matching rule: account id mapping
- Read-only mode available: true
- Dry-run mode available: true

## Automation Permissions
- Sync holdings automatically: yes
- Generate trade proposals automatically: yes
- Execute trades automatically: no by default
- Send reports automatically: yes
- Require user approval for new instruments: yes
- Require user approval for first purchase: yes
- Require user approval for sales: yes unless auto_trade_limited is enabled

## Approved Instruments
| ISIN / Ticker | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| AAA | ETF A | Global equities | 60 | 50 | 70 | EBS / SMART | CHF | ibkr_symbol=AAA; ibkr_conid=1001; ibkr_primary_exchange=EBS |

## Excluded Instruments
| ISIN / Ticker | Reason |
|---|---|
| none | |

## Delivery Policy
- Delivery mode: email_and_repo
`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: etf

- Date/time: 2026-05-05 11:05:00
- Total value CHF: 5000
- Invested value CHF: 1000
- Cash CHF: 4000
- Unmatched holdings: none
- Pricing source: broker_api
- Source: manual_fixture
- Broker: interactive_brokers
- Base currency: CHF

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| AAA | ETF A | Global equities | 1 | 1000 | CHF | 1 | 1000 | 20 | 60 | -40 |

## Cash
| Currency | Amount | FX rate to CHF | Value CHF |
|---|---:|---:|---:|
| CHF | 4000 | 1 | 4000 |
`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: etf

## Trade Log
| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|
| 2026-05-05 11:05:00 | filled | buy | AAA | ETF A | 1 | 500 | 500 | 500 | notification backfill fixture | broker_filled | 9107 | | | | |
`);

  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: etf

## Daily Valuation History
| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| 2026-05-05 | fill | 5000 | 1000 | 4000 | 0 | 0 | ok |
`);

  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({
    notifiedFills: [],
    reconciledUnnotifiedFills: [9107],
    acknowledgedBackfilledFills: [],
  }, null, 2));

  const generated = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
  const summary = JSON.parse(fs.readFileSync(path.join(portfolioDir, 'summary.json'), 'utf8'));
  assert.strictEqual(
    summary.recommendedNextStep,
    '1 reconciled fill(s) were detected after the live window and still need notification backfill review.',
    `unexpected recommendedNextStep: ${summary.recommendedNextStep}`,
  );
  assert(summary.operatorQueue.items.some((item) => item.status === 'backfill_review'), 'expected typed backfill_review queue item');
  assert(generated.outPath.endsWith('summary.json'), 'expected summary artifact path');
  assert(generated.htmlPath.endsWith('summary.html'), 'expected summary html artifact path');
  console.log(JSON.stringify({ ok: true, recommendedNextStep: summary.recommendedNextStep }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
