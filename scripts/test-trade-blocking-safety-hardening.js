const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function basePortfolio({ notes = '- settled', excludedRows = '| none | none |', accountReference = 'demo' } = {}) {
  return `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: ${accountReference}\n- Execution mode: require_confirmation\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n${excludedRows}\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 50%\n- Max single issuer allocation: 60%\n- Max equity allocation: 80%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 25%\n- Stop trading if portfolio value drops by: 20% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for new instruments: yes\n- Require user approval for first purchase: no\n- Require user approval for sales: no\n\n## Notes / Open Questions\n${notes}\n`;
}

function baseHoldings({ pricingSource = 'broker_api', warnings = '- none' } = {}) {
  return `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 11:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 1000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| ZZZ | Existing ETF | Global equities | 1 | 1000 | CHF | 1 | 1000 | 20 | 20 | 0 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: ${pricingSource}\n- Warnings:\n ${warnings}\n`;
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trade-safety-hardening-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  const originalLoad = Module._load;
  let readiness = { configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'ok' };

  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return {
        getInteractiveBrokersReadiness: async () => readiness,
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    const { evaluateExecutionPolicy } = require('../src/execution/portfolioExecution');
    const { validateApprovedInstruments } = require('../src/validation/approvedInstrumentValidation');

    const order = {
      symbol: 'AAA',
      conid: '1001',
      action: 'BUY',
      quantity: 1,
      orderType: 'LMT',
      limitPrice: 50,
      currency: 'CHF',
      exchange: 'SMART',
      secType: 'STK',
      userApproved: true,
    };

    fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), basePortfolio({ notes: '- Need to decide final issuer mix?' }));
    fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), baseHoldings());
    let result = await evaluateExecutionPolicy({ portfolioDir, order, live: true, requireApproval: true });
    assert(!result.ok, 'Expected unresolved open questions to block execution');
    assert(result.blockers.some((entry) => /open questions/i.test(entry.message || entry)), 'Expected open-question blocker message');
    assert(result.primaryBlocker && result.primaryBlocker.code, 'Expected primary blocker metadata');

    fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), basePortfolio({ excludedRows: '| AAA | test exclusion |' }));
    const overlapIssues = validateApprovedInstruments(path.join(portfolioDir, 'portfolio.md'));
    assert(overlapIssues.some((issue) => /also appears in Excluded Instruments/i.test(issue.message)), 'Expected approved/excluded overlap validation issue');
    result = await evaluateExecutionPolicy({ portfolioDir, order, live: true, requireApproval: true });
    assert(!result.ok, 'Expected excluded approved instrument overlap to block execution');
    assert(result.blockers.some((entry) => /explicitly excluded/i.test(entry.message || entry) || /also appears in Excluded Instruments/i.test(entry.message || entry)), 'Expected exclusion blocker message');

    fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), basePortfolio());
    fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), baseHoldings({ pricingSource: 'stale_cache', warnings: '- stale price data from prior session' }));
    result = await evaluateExecutionPolicy({ portfolioDir, order, live: true, requireApproval: true });
    assert(!result.ok, 'Expected stale pricing to block execution');
    assert(result.blockers.some((entry) => /stale/i.test(entry.message || entry)), 'Expected stale pricing blocker message');

    fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), baseHoldings({ pricingSource: 'simulated', warnings: '- Simulated pricing assumptions still active.' }));
    result = await evaluateExecutionPolicy({ portfolioDir, order, live: true, requireApproval: true });
    assert(!result.ok, 'Expected simulated pricing to block execution');
    assert(result.blockers.some((entry) => /simulated pricing/i.test(entry.message || entry)), 'Expected simulated pricing blocker message');

    fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), baseHoldings());
    fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), basePortfolio({ accountReference: '<account_alias_or_safe_identifier>' }));
    readiness = { configured: false, authenticated: false, reachable: false, fallbackRequired: true, reason: 'missing_config', message: 'Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.' };
    result = await evaluateExecutionPolicy({ portfolioDir, order, live: true, requireApproval: true });
    assert(!result.ok, 'Expected broker uncertainty to block execution');
    assert(result.blockers.some((entry) => /Broker readiness is not healthy/i.test(entry.message || entry)), 'Expected broker readiness blocker');
    assert(result.blockers.some((entry) => /configuration is incomplete/i.test(entry.message || entry)), 'Expected broker configuration blocker');
    assert(result.blockers.some((entry) => /account reference is unresolved/i.test(entry.message || entry)), 'Expected unresolved account reference blocker');
    assert(result.submitReady === false, 'Expected broker-blocked policy to mark submitReady false');

    readiness = { configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'ok' };
    fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), basePortfolio());
    fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), baseHoldings());
    result = await evaluateExecutionPolicy({ portfolioDir, order, live: true, requireApproval: true });
    assert(result.ok, `Expected clean fixture to pass after hardening, got ${JSON.stringify(result)}`);
    assert(result.submitReady === true, 'Expected clean fixture to be ready to submit');

    console.log(JSON.stringify({ ok: true }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
