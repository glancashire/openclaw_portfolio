const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const Module = require('module');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-readiness-retryable-queued-'));
const portfolioDir = path.join(tempDir, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF\n\n## Status\n- Status: active\n- Execution mode: transmitted_live\n`);
fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: ETF\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 06:33:50 | approved | buy | CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | 6 | 157.08 | 942.48 | 0 | blocked queued row | queued_for_open_runner |  | pricing_reference_unavailable | Broker returned quote data, but no usable live or delayed reference price fields were available for safe smart-limit construction. | 2026-05-11 09:10:00 | Retry at next intended market-open run after operator recovery. |\n`);

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../brokers/interactive-brokers/readiness') {
    return { getInteractiveBrokersReadiness: async () => ({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, marketDataMode: 'live_or_realtime', reason: 'ready', message: 'ready' }) };
  }
  if (request === './runtimeState') {
    return {
      brokerErrorStatus: () => ({ consecutive: 0, stopAutomation: false }),
      readExecutionState: () => ({ liveExecutionArms: { etf: { armedAt: '2026-05-11T08:00:00.000Z', expiresAt: '2099-05-11T12:00:00.000Z' } } }),
      writeExecutionState: () => {},
    };
  }
  return originalLoad(request, parent, isMain);
};

const { evaluateLiveReadinessPreflight } = require('../src/execution/liveReadinessPreflight');

(async () => {
  const result = await evaluateLiveReadinessPreflight({ portfolioDir, now: new Date('2026-05-11T10:00:00.000Z') });
  assert(result.approvalState.executableCount === 1, `expected retryable queued row to remain executable for open-runner handling, got ${result.approvalState.executableCount}`);
  assert(result.approvalState.executableRows.length === 1, 'expected one executable row');
  assert(result.approvalState.executableRows[0].blockCode === 'pricing_reference_unavailable', `expected block code surfaced on executable row, got ${result.approvalState.executableRows[0].blockCode}`);
  assert(/usable live or delayed reference price/i.test(result.approvalState.executableRows[0].blockReason), 'expected block reason surfaced on executable row');
  assert(/retry/i.test(result.approvalState.executableRows[0].nextAction), 'expected retry next action surfaced on executable row');
  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
