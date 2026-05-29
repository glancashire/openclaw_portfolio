const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildExecutableOrderDiagnostics, parseHoursSegments } = require('../src/execution/executionDiagnostics');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-diag-'));
const portfolioDir = path.join(dir, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });

fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | Global equities | 40 | 30 | 50 | IBIS / SMART | EUR | ibkr_symbol=UBSPX; ibkr_local_symbol=BCFT; ibkr_conid=808613958; ibkr_primary_exchange=IBIS |\n| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | Global equities | 20 | 10 | 30 | Xetra / IBKR-supported venue | EUR | ibkr_symbol=EMUAA; ibkr_conid=243939970 |\n`);

fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-21 09:27:46 | approved | buy | IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | 8 | 122.845 | 984.28 | 0 | test row | queued_for_open_runner |  |  |  |  | First open-runner attempt pending. |\n`);

const segments = parseHoursSegments('20260521:0900-1745;20260522:CLOSED');
assert.strictEqual(segments.length, 2);
assert.strictEqual(segments[0].date, '20260521');
assert.strictEqual(segments[0].start, '0900');
assert.strictEqual(segments[0].end, '1745');
assert.strictEqual(segments[1].closed, true);

const beforeTrades = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');

const diagnostics = buildExecutableOrderDiagnostics({
  portfolioDir,
  contractDetailsByTicker: {
    IE00BD4TXW66: {
      symbol: 'UBSPX',
      localSymbol: 'BCFT',
      exchange: 'SMART',
      primaryExchange: 'IBIS',
      currency: 'EUR',
      tradingHours: '20260521:0730-2300',
      liquidHours: '20260521:0900-1745',
    },
  },
});

assert.strictEqual(diagnostics.length, 1);
assert.strictEqual(diagnostics[0].approvedInstrument.ibkrPrimaryExchange, 'IBIS');
assert.strictEqual(diagnostics[0].preparedOrder.primaryExchange, 'IBIS');
assert.strictEqual(diagnostics[0].preparedOrder.exchange, 'SMART');
assert.strictEqual(diagnostics[0].preparedOrder.symbol, 'UBSPX');
assert.strictEqual(diagnostics[0].contractDetails.primaryExchange, 'IBIS');
assert.strictEqual(diagnostics[0].contractDetails.liquidHoursSegments[0].start, '0900');
const afterTrades = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
assert.strictEqual(afterTrades, beforeTrades, 'diagnostics helper must not mutate trades.md');
console.log(JSON.stringify({ ok: true }, null, 2));
