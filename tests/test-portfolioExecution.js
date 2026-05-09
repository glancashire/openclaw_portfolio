'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function portfolioText({ accountReference = 'demo', notes = '- settled' } = {}) {
  return `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: ${accountReference}\n- Execution mode: require_confirmation\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | none |\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 50%\n- Max single issuer allocation: 60%\n- Max equity allocation: 80%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 25%\n- Stop trading if portfolio value drops by: 20% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for new instruments: yes\n- Require user approval for first purchase: no\n- Require user approval for sales: no\n\n## Notes / Open Questions\n${notes}\n`;
}

function holdingsText({ pricingSource = 'broker_api' } = {}) {
  return `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 11:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 1000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| ZZZ | Existing ETF | Global equities | 1 | 1000 | CHF | 1 | 1000 | 20 | 20 | 0 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: ${pricingSource}\n- Warnings:\n - none\n`;
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-portfolio-execution-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), portfolioText());
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), holdingsText());

  const originalLoad = Module._load;
  let readiness = { configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'ok' };
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return { getInteractiveBrokersReadiness: async () => readiness };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    const { evaluateExecutionPolicy } = require('../src/execution/portfolioExecution');
    const liveOrder = { symbol: 'AAA', conid: '1001', action: 'BUY', quantity: 1, userApproved: true };

    let result = await evaluateExecutionPolicy({ portfolioDir, order: liveOrder, live: true, requireApproval: true });
    assert(result.ok, 'expected clean live order to be allowed');
    assert(result.submitReady === true, 'expected submitReady true for clean order');

    readiness = { configured: false, authenticated: false, reachable: false, fallbackRequired: true, reason: 'native_error', message: 'Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.' };
    result = await evaluateExecutionPolicy({ portfolioDir, order: liveOrder, live: true, requireApproval: true });
    assert(!result.ok, 'expected broker readiness to block');
    assert(result.primaryBlocker && result.primaryBlocker.code, 'expected primary blocker');
    assert(result.submitReady === false, 'expected submitReady false when blocked');
    assert(/Restore IBKR readiness/i.test(result.nextAction), 'expected readiness next action');

    fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), holdingsText({ pricingSource: 'simulated' }));
    readiness = { configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'ok' };
    result = await evaluateExecutionPolicy({ portfolioDir, order: liveOrder, live: true, requireApproval: true });
    assert(!result.ok, 'expected simulated pricing to block');
    assert(result.blockers.some((b) => b.code === 'pricing_unready'), 'expected pricing blocker code');

    fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), holdingsText());
    fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), portfolioText({ accountReference: '<account_alias_or_safe_identifier>' }));
    result = await evaluateExecutionPolicy({ portfolioDir, order: liveOrder, live: true, requireApproval: true });
    assert(!result.ok, 'expected unresolved account reference to block');
    assert(result.blockers.some((b) => b.code === 'account_reference_unresolved'), 'expected account reference blocker code');

    console.log(JSON.stringify({ ok: true }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
