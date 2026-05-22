# Basket Execution Runbook

_Last updated: Phase 198 — full autonomous flow with single approval per round._

## TL;DR

After bootstrap, every rebalance round is exactly:

1. Assistant: `node scripts/propose-basket.js --portfolio=etf` (writes a fresh proposal envelope, no broker writes).
2. Operator: type `approve` if happy with the proposal.
3. Assistant: `node scripts/execute-approved-basket-end-to-end.js` (no args; loads latest proposal automatically, transmits, monitors, mirrors, notifies, resyncs).
4. If any leg cancels: assistant emits a reproposal envelope automatically and tells operator.
5. Operator: type `approve` again if happy with the reproposal.
6. Assistant: `node scripts/approve-and-execute-reproposal.js --parent=<id>`.

Steps 4–6 may repeat. Operator never edits code or JSON.

---

## Prerequisites

- IB Gateway running on the pinned native path (see `TOOLS.md`); 2FA login completed; API socket on `127.0.0.1:4001`.
- Live execution arm in place (`runtime/execution-state.json` shows an `armedForMarketOpen` window covering current time).
- `portfolio/<portfolio>/portfolio.md` has fresh Approved Instruments table with `ibkr_symbol`, `ibkr_conid`, `ibkr_primary_exchange`, `fx_to_chf` metadata.
- Holdings synced recently: `node scripts/sync-interactive-brokers-holdings.js portfolio/<portfolio>`.

## Stage 1 — Propose

```
node scripts/propose-basket.js --portfolio=etf
```

What it does:

- Reads `portfolio/etf/portfolio.md` (Approved Instruments + targets).
- Reads `portfolio/etf/holdings.md` (current positions + cash).
- Fetches live quotes via `client.native.fetchMarketSnapshot([conid...])`.
- Computes per-leg gap, sizes quantity, applies markup over ask (0.5%) or close (0.75%), rounds to instrument tick (0.05 CHF for SIX, 0.01 elsewhere).
- Preserves Swiss sleeve split: 12% UBSSLI (CHSPI) + 8% SPMCHA.
- Writes envelope to `runtime/basket-proposals/etf/basket-etf-<timestamp>.json`.
- Prints a human-readable preview with per-leg limits and reference prices.

**Operator action**: read the preview. If happy, reply `approve`. If not, ask for adjustments.

## Stage 2 — Execute

```
node scripts/execute-approved-basket-end-to-end.js
```

(No flags needed.)

What it does:

- Loads the most recent proposal envelope from `runtime/basket-proposals/etf/`.
- Promotes it to an approved basket envelope (status flipped, `approvedAt` stamped, `promotedFromProposal` recorded).
- Invokes `executeApprovedBasket` which uses `prepareOrderForSubmission` with `enforceMarketHours: false`. Each leg becomes a transmitted live order.
- Settling delay (5s) then polls `client.native.fetchOpenOrders()` every 30s for up to 10 minutes.
- Any leg still open after 10 minutes is cancelled via `client.cancelOrder(...)`.
- Calls `reconcileBasketRunFromBroker` using IBKR `executions` + `completed-orders` feeds — moves each leg into terminal state (`filled` / `cancelled`).
- Mirrors filled/cancelled legs into `portfolio/etf/trades.md` (idempotent on broker order id).
- Sends fill emails via `notifyTradeFill` for legs that were *newly* mirrored in this run (so re-runs do not double-email).
- Resyncs holdings.
- If any leg ended `cancelled`, builds a reproposal envelope at `runtime/basket-reproposals/etf/<approvalId>-reproposal-<n>.json` with a fresh limit price (0.5% over current ask, 0.75% over current close, rounded to tick). Older un-promoted reproposals for the same parent are auto-archived to `.superseded/`.

**Operator action**: read the assistant's summary. If a reproposal was emitted, the operator decides whether to approve it.

## Stage 3 — Reproposal Approval (only if needed)

```
node scripts/approve-and-execute-reproposal.js --parent=<parent-approval-id>
```

What it does:

- Calls `promoteReproposalToApproval` (idempotent) to convert the latest reproposal envelope into an approved basket.
- Invokes the canonical runner.
- Runs the same lifecycle (monitor + reconcile + mirror + notify + resync + reproposal hook).
- A second-round cancellation triggers a third-round reproposal, etc. Each round is one approval.

**Operator action**: read the assistant's summary. If filled, the round is complete. If cancelled again, decide whether to approve another reproposal.

## Where the operator surface shows pending reproposals

- `runtime/overview/pending-actions.json` — items with `kind: 'basket_reproposal_pending'`.
- `runtime/overview/approvals-queue.md` — reproposal items appear at the top with severity/urgency.
- `recommendedOperatorAction` on each item gives the exact command to run.

Each reproposal surface item collapses to the latest version per parent (Phase 194), so the queue does not accumulate noise across iterations.

## Failure modes

| Symptom | Cause | Recovery |
|---|---|---|
| `Cannot load proposal: No proposal envelope found` | No proposal exists. | Run Stage 1 first. |
| `⚠️ Latest proposal is N min old` | Proposal stale (>60 min). | Re-run Stage 1 to refresh quotes. |
| Runner reports `submitted` but reconcile shows `cancelled` | Broker rejected at exchange (limit too low, tick mismatch, thin liquidity). | A reproposal is auto-emitted; operator may approve it or wait for better quote. |
| Lifecycle says "fetchOpenOrders error: ECONNREFUSED" | IB Gateway disconnected. | Restart IB Gateway per `TOOLS.md`; re-run `--reconcile-only --approval-id=<id>` to finish reconciling. |
| Runner says `Stored approval envelope is invalid: expiresAt is required` | Envelope missing required field. | All current generators emit `expiresAt`. If you see this, check the envelope JSON. |

## Re-running reconciliation only

If the lifecycle was interrupted (e.g., assistant died mid-monitor), you can complete the reconcile pass without re-transmitting:

```
node scripts/execute-approved-basket-end-to-end.js --reconcile-only --approval-id=<id>
```

This skips the monitor block, fetches fresh broker evidence, mirrors, notifies (idempotent — won't double-email), resyncs, and emits a reproposal if needed.

## Operator's contract

- One `approve` per round.
- Never edit code in `scripts/` or `src/` between rounds. The proposal and reproposal envelopes are the only inputs the assistant needs.
- If the proposal preview looks wrong (e.g., the math is off, or you want to skip a leg), say so — assistant will adjust and write a new proposal envelope, then ask for approval again.
- The assistant will NOT transmit a basket without an explicit `approve`.
