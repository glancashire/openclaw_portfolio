const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const assert = require('assert');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transmitted-live-gating-'));
const portfolioDir = path.join(tempDir, 'portfolio');
fs.mkdirSync(portfolioDir, { recursive: true });

function writeFixture(executionMode = 'require_confirmation') {
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: Test\n\n## Status\n- Status: active\n- Broker account reference: UTEST123\n- Execution mode: ${executionMode}\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| LU0950668870 | Test ETF | Global equities | 100 | 0 | 100 | SMART | EUR | ibkr_symbol=EMUAA; ibkr_conid=243939970; fx_to_chf=1 |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | none |\n\n## Market Entry Policy\n- Require confirmation before first live trade: true\n\n## Risk Limits\n- Max single ETF allocation: 100%\n- Max single issuer allocation: 100%\n- Max equity allocation: 100%\n- Max cash drag after full deployment: 100%\n- Stop trading if portfolio value drops by: 50% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for first purchase: yes\n- Require user approval for sales: yes\n`);
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: Test\n\n## Summary\n- Date/time: 2026-05-06 10:00:00\n- Total value CHF: 10000\n- Cash CHF: 10000\n- Invested value CHF: 0\n- Unmatched holdings: none\n- Pricing source: broker_live\n\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Price | Market value CHF | Currency | Notes |\n|---|---|---:|---:|---:|---|---|\n`);
}

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
  writeFixture('require_confirmation');
  let mod = loadModule({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'ok' });
  let result = await mod.evaluateExecutionPolicy({
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
      transmit: true,
      userApproved: true,
      transmittedLiveAck: 'I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER',
    },
    live: true,
    transmitted: true,
    requireApproval: true,
  });
  assert(result.ok === false, 'Expected transmitted mode to fail outside transmitted_live execution mode');
  assert(result.blockers.some((entry) => /not transmitted_live/i.test(entry)), 'Expected transmitted_live mode blocker');

  writeFixture('transmitted_live');
  mod = loadModule({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'ok' });
  result = await mod.evaluateExecutionPolicy({
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
      transmit: true,
      userApproved: true,
    },
    live: true,
    transmitted: true,
    requireApproval: true,
  });
  assert(result.ok === false, 'Expected missing acknowledgement to block transmitted live path');
  assert(result.blockers.some((entry) => /transmittedLiveAck/i.test(entry)), 'Expected transmittedLiveAck blocker');

  result = await mod.evaluateExecutionPolicy({
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
      transmit: true,
      userApproved: true,
      transmittedLiveAck: 'I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER',
    },
    live: true,
    transmitted: true,
    requireApproval: true,
  });
  assert(result.ok === true, `Expected transmitted live policy to pass, got blockers: ${JSON.stringify(result.blockers)}`);
  assert(result.transmitted === true, 'Expected transmitted flag in policy result');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
