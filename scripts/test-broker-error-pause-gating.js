const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const assert = require('assert');
const { clearBrokerErrors, recordBrokerError } = require('../src/execution/runtimeState');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'broker-error-pause-gating-'));
const portfolioDir = path.join(tempDir, 'portfolio');
fs.mkdirSync(portfolioDir, { recursive: true });

fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: Test\n\n## Status\n- Status: active\n- Broker account reference: UTEST123\n- Execution mode: require_confirmation\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| LU0950668870 | Test ETF | Global equities | 100 | 0 | 100 | SMART | EUR | ibkr_symbol=EMUAA; ibkr_conid=243939970; fx_to_chf=1 |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | none |\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 100%\n- Max single issuer allocation: 100%\n- Max equity allocation: 100%\n- Max cash drag after full deployment: 100%\n- Stop trading if portfolio value drops by: 50% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for first purchase: no\n- Require user approval for sales: no\n`);
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: Test\n\n## Summary\n- Date/time: 2026-05-06 10:00:00\n- Total value CHF: 10000\n- Cash CHF: 10000\n- Invested value CHF: 0\n- Unmatched holdings: none\n- Pricing source: broker_live\n\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Price | Market value CHF | Currency | Notes |\n|---|---|---:|---:|---:|---|---|\n`);

function loadModule(readiness) {
  const target = path.resolve(process.cwd(), 'src/execution/portfolioExecution.js');
  const original = Module._load;
  delete require.cache[target];
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return { getInteractiveBrokersReadiness: async () => readiness };
    }
    return original.apply(this, arguments);
  };
  try {
    return require(target);
  } finally {
    Module._load = original;
  }
}

(async () => {
  const portfolioName = path.basename(portfolioDir);
  clearBrokerErrors(portfolioName);
  recordBrokerError({ portfolio: portfolioName, reason: 'status_error', message: 'one' });
  recordBrokerError({ portfolio: portfolioName, reason: 'status_error', message: 'two' });
  recordBrokerError({ portfolio: portfolioName, reason: 'status_error', message: 'three' });

  const mod = loadModule({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'ok' });
  const result = await mod.evaluateExecutionPolicy({
    portfolioDir,
    order: {
      symbol: 'EMUAA',
      conid: '243939970',
      action: 'BUY',
      quantity: 1,
      orderType: 'LMT',
      limitPrice: 38.5,
      currency: 'EUR',
      exchange: 'SMART',
      secType: 'STK',
      userApproved: true,
    },
    live: true,
    transmitted: false,
    requireApproval: true,
  });

  assert(result.ok === false, 'Expected broker error pause to block live execution');
  assert(result.blockers.some((entry) => /paused after 3 consecutive broker errors/i.test(entry.message || '')), 'Expected broker pause blocker');
  assert(result.primaryBlocker?.code === 'broker_automation_paused', 'Expected broker_automation_paused primary blocker');
  clearBrokerErrors(portfolioName);
  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
