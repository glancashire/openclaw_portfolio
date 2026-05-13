const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { appendTradeProposals } = require('../src/analysis/tradeLogWriter');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trade-log-writer-'));
const tradesPath = path.join(dir, 'trades.md');
fs.writeFileSync(tradesPath, `# Trades: test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n`);

appendTradeProposals(tradesPath, [{
  status: 'proposed',
  action: 'buy',
  instrument: 'AAA',
  instrumentName: 'ETF A',
  quantity: 10,
  limitPrice: 100,
  estimatedOrderChf: 1000,
  rationale: 'test rationale',
  allocationBeforePct: 0,
  allocationTargetPct: 20,
  allocationAfterPct: 19.7,
  driftBefore: -20,
  driftAfter: -0.3,
  driftCorrected: 19.7,
  fundingSource: 'cash',
  riskNote: 'test risk',
  blocked: true,
  blockedReason: 'Cash drag remains above policy after proposed trades (39.82%).'
}], '2026-05-13 13:30:00');

const text = fs.readFileSync(tradesPath, 'utf8');
assert(/pending_user_approval/.test(text), 'expected generic blocked proposal to remain pending_user_approval');
assert(!/blocked_by_min_trade_size/.test(text), 'did not expect min-trade-size approval label for non-min-size block');
console.log(JSON.stringify({ ok: true }, null, 2));
