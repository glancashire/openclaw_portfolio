const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const assert = require('assert');

const target = path.resolve(process.cwd(), 'src/execution/liveReadinessPreflight.js');

function createFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-artifact-'));
  const portfolioDir = path.join(tempDir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'runtime'), { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF\n\n## Status\n- Status: active\n- Broker account reference: UTEST123\n- Execution mode: transmitted_live\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | Global equities | 40 | 30 | 50 | IBIS / SMART | EUR | ibkr_symbol=UBSPX; ibkr_local_symbol=BCFT; ibkr_conid=808613958; ibkr_primary_exchange=IBIS |\n`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-21 09:27:46 | approved | buy | IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | 8 | 122.845 | 984.28 | 0 | test row | user_approved |  |  |  |  | First open-runner attempt pending. |\n`);

  fs.writeFileSync(path.join(tempDir, 'runtime', 'execution-state.json'), JSON.stringify({
    liveExecutionArms: {
      etf: { armedAt: '2026-05-21T09:00:00Z', expiresAt: '2099-05-21T18:00:00Z', note: 'armed' }
    }
  }, null, 2));

  return { tempDir, portfolioDir };
}

function loadWithMocks(readiness) {
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
  const cwd = process.cwd();
  const { tempDir, portfolioDir } = createFixture();
  process.chdir(tempDir);
  const mod = loadWithMocks({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, message: 'ready' });
  const result = await mod.evaluateLiveReadinessPreflight({
    portfolioDir,
    now: new Date('2026-05-21T10:00:00Z'),
    contractDetailsByTicker: {
      IE00BD4TXW66: {
        symbol: 'UBSPX',
        localSymbol: 'BCFT',
        exchange: 'SMART',
        primaryExchange: 'IBIS',
        currency: 'EUR',
        tradingHours: '20260521:0730-2300',
        liquidHours: '20260521:0900-1745',
      }
    }
  });

  const artifactPath = path.join(tempDir, 'runtime', 'pre-submit-diagnostics', 'etf-live-readiness.json');
  assert(fs.existsSync(artifactPath), 'expected live-readiness diagnostic artifact');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  assert.strictEqual(artifact.portfolio, 'etf');
  assert(Array.isArray(artifact.marketWindow.diagnostics));
  assert.strictEqual(artifact.marketWindow.diagnostics[0].hours.liquid.status, 'open');
  assert.strictEqual(result.marketWindow.diagnostics[0].hours.trading.status, 'open');
  process.chdir(cwd);
  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
