'use strict';

/* Phase 197 — End-to-end pipeline integration test (no live broker).
 *
 * Simulates the full workflow:
 *   1. propose-basket → 1 leg
 *   2. promote → approved basket
 *   3. executeApprovedBasket with stub submitLeg → 1 leg "submitted"
 *   4. runBasketLifecycle simulating cancellation → reproposal
 *   5. promote reproposal → approved basket
 *   6. executeApprovedBasket → 1 leg submitted
 *   7. runBasketLifecycle simulating fill → final state all filled
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const realRoot = path.resolve(__dirname, '..');
const { generateBasketProposal, parseApprovedInstruments, saveProposalEnvelope } = require(path.join(realRoot, 'src/execution/basketProposalGenerator'));
const { saveApprovalEnvelope } = require(path.join(realRoot, 'src/execution/basketApprovalStore'));
const { executeApprovedBasket } = require(path.join(realRoot, 'src/execution/basketExecutionRunner'));
const { runBasketLifecycle } = require(path.join(realRoot, 'src/execution/basketLifecycle'));
const { promoteReproposalToApproval, latestReproposal } = require(path.join(realRoot, 'src/execution/basketReproposalPromoter'));

function setupFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-'));
  // Symlink src/lib/skills so the lifecycle helper resolves them at this fake root.
  fs.symlinkSync(path.join(realRoot, 'src'), path.join(root, 'src'));
  fs.symlinkSync(path.join(realRoot, 'lib'), path.join(root, 'lib'));
  fs.symlinkSync(path.join(realRoot, 'skills'), path.join(root, 'skills'));

  const portfolioDir = path.join(root, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });

  // Minimal portfolio.md with one approved instrument
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| CH0130595124 | UBS SPI Mid | Swiss equities | 8 | 4 | 12 | SIX | CHF | ibkr_symbol=SPMCHA; ibkr_conid=91639399; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| CASH-CHF | CHF cash balance | Bonds / cash-like | 92 | 80 | 100 | IBKR | CHF | n/a |
`);

  // Empty holdings + plenty of cash
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: etf\n\n## Cash\n| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |\n|---|---|---:|---:|---:|---|\n| Broker account | CHF | 30000 | 1 | 30000 | SettledCash |\n`);
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n');

  return { root, portfolioDir };
}

(async () => {
  const { root, portfolioDir } = setupFixture();
  const portfolio = 'etf';

  // ── Step 1: Generate proposal ───────────────────────────────────────────
  const portfolioMd = fs.readFileSync(path.join(portfolioDir, 'portfolio.md'), 'utf8');
  const approved = parseApprovedInstruments(portfolioMd);
  assert.strictEqual(approved.length, 1, 'fixture should yield exactly 1 non-cash instrument');

  const stubQuotes = new Map([
    [91639399, { ask: NaN, lastClose: 128.50 }],
  ]);
  const liveQuoteFn = async (conid) => stubQuotes.get(Number(conid)) || null;

  const proposalResult = await generateBasketProposal({
    portfolio,
    approvedInstruments: approved,
    holdingsByIsin: {},
    cashChf: 30000,
    liveQuoteFn,
  });
  assert.strictEqual(proposalResult.envelope.legs.length, 1);
  const proposalLeg = proposalResult.envelope.legs[0];
  assert.strictEqual(proposalLeg.ibkrSymbol, 'SPMCHA');
  assert(proposalLeg.limitPrice > 128.50, `proposal limit must exceed close 128.50, got ${proposalLeg.limitPrice}`);

  saveProposalEnvelope({ rootDir: root, portfolio, envelope: proposalResult.envelope });

  // ── Step 2: Promote to approved basket ──────────────────────────────────
  const approvalId = proposalResult.envelope.approvalId;
  saveApprovalEnvelope({
    ...proposalResult.envelope,
    status: 'approved',
    legs: proposalResult.envelope.legs.map((leg) => ({ ...leg, status: 'approved' })),
  }, { rootDir: root });

  // ── Step 3: Run executor with stub submitLeg ────────────────────────────
  let stubOrderId = 9001;
  const round1Submit = async () => ({ ok: true, brokerResult: { order: { orderId: stubOrderId++, status: 'Submitted' } } });
  const round1Run = await executeApprovedBasket({
    portfolioDir,
    approvalId,
    rootDir: root,
    submitLeg: round1Submit,
  });
  assert.strictEqual(round1Run.runState.summary.submitted, 1, 'round1: 1 leg submitted');
  const round1Leg = round1Run.runState.legs['leg-1'];
  assert.strictEqual(round1Leg.status, 'submitted');
  assert.strictEqual(round1Leg.brokerOrderId, 9001);

  // ── Step 4: Lifecycle simulating cancellation ───────────────────────────
  const stubClient = {
    native: {
      fetchOpenOrders: async () => [],
      fetchMarketSnapshot: async (conids) => conids.map((c) => ({ conid: c, ask: NaN, last: 128.50, close: 128.50 })),
    },
    cancelOrder: async (id) => ({ cancel: { orderId: id, status: 'cancelled' } }),
  };
  const ibkrJsonRound1 = (cmd) => {
    if (cmd === 'executions') return [];
    if (cmd === 'completed-orders') return [{ orderId: 9001, symbol: 'SPMCHA', status: 'Cancelled', filledQty: 0, qty: 19 }];
    return null;
  };
  const lifecycleR1 = await runBasketLifecycle({
    portfolio,
    approvalId,
    rootDir: root,
    portfolioDir,
    client: stubClient,
    runState: round1Run.runState,
    options: {
      skipMonitor: true,
      logger: () => {},
      ibkrJson: ibkrJsonRound1,
      notifyTradeFill: async () => ({ attempted: true, sent: true, result: { id: 'mock' } }),
      resyncHoldings: async () => 'resync-stub',
    },
  });
  assert.strictEqual(lifecycleR1.cancelledLegCount, 1, 'expected 1 cancelled leg after round 1');
  assert.strictEqual(lifecycleR1.reconciled.summary.filled, 0);
  assert.strictEqual(lifecycleR1.reconciled.summary.cancelled, 1);
  assert(lifecycleR1.reproposal && !lifecycleR1.reproposal.skipped, 'reproposal must be built');
  assert.strictEqual(lifecycleR1.reproposal.envelope.legs.length, 1);
  const reproposedLeg = lifecycleR1.reproposal.envelope.legs[0];
  assert(reproposedLeg.limitPrice > proposalLeg.limitPrice, 'reproposed limit must exceed previous');

  // ── Step 5: Promote reproposal → approved basket ────────────────────────
  const promoted = promoteReproposalToApproval({
    portfolio,
    parentApprovalId: approvalId,
    rootDir: root,
  });
  assert.strictEqual(promoted.ok, true);
  assert.strictEqual(promoted.alreadyPromoted, false);
  const reproApprovalId = `${approvalId}-reproposal-${promoted.version}`;

  // ── Step 6: Run executor again with stub submitLeg ──────────────────────
  const round2Submit = async () => ({ ok: true, brokerResult: { order: { orderId: stubOrderId++, status: 'Submitted' } } });
  const round2Run = await executeApprovedBasket({
    portfolioDir,
    approvalId: reproApprovalId,
    rootDir: root,
    submitLeg: round2Submit,
  });
  assert.strictEqual(round2Run.runState.summary.submitted, 1);
  const round2Leg = round2Run.runState.legs['leg-1'];
  assert.strictEqual(round2Leg.status, 'submitted');
  assert.strictEqual(round2Leg.brokerOrderId, 9002);

  // ── Step 7: Lifecycle simulating successful fill ────────────────────────
  const ibkrJsonRound2 = (cmd) => {
    if (cmd === 'executions') return [{ orderId: 9002, symbol: 'SPMCHA', side: 'BOT', shares: 19, price: reproposedLeg.limitPrice - 0.05, currency: 'CHF' }];
    if (cmd === 'completed-orders') return [];
    return null;
  };
  const lifecycleR2 = await runBasketLifecycle({
    portfolio,
    approvalId: reproApprovalId,
    rootDir: root,
    portfolioDir,
    client: stubClient,
    runState: round2Run.runState,
    options: {
      skipMonitor: true,
      logger: () => {},
      ibkrJson: ibkrJsonRound2,
      notifyTradeFill: async () => ({ attempted: true, sent: true, result: { id: 'mock' } }),
      resyncHoldings: async () => 'resync-stub',
    },
  });
  assert.strictEqual(lifecycleR2.cancelledLegCount, 0, 'no cancellations expected in round 2');
  assert.strictEqual(lifecycleR2.reconciled.summary.filled, 1);
  assert.strictEqual(lifecycleR2.reconciled.summary.cancelled, 0);
  assert.strictEqual(lifecycleR2.mirror.appended, 1, 'one new fill row mirrored');
  assert.strictEqual(lifecycleR2.notifyResults.length, 1, 'one fill notified');
  assert(!lifecycleR2.reproposal || lifecycleR2.reproposal.skipped, 'no further reproposal expected');

  // Trade log should now include the cancelled row from round 1 and the filled row from round 2
  const trades = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
  assert(trades.includes('| filled |'), 'final trades.md must contain filled row');
  assert(trades.includes('| cancelled |'), 'final trades.md must contain cancelled row');
  assert(trades.includes('9001'), 'cancelled broker order id must appear');
  assert(trades.includes('9002'), 'filled broker order id must appear');

  console.log(JSON.stringify({ ok: true, rounds: 2, finalFilled: lifecycleR2.reconciled.summary.filled }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
