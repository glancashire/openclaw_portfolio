# Basket Execution Runbook

_Last updated: Phase 219 — aligned with the stable resting-state workflow, dashboard/reporting surfaces, and recovery helpers._

## TL;DR

A basket round is still approval-gated and operator-driven:

1. Assistant/operator generates a proposal basket.
2. Operator reviews the proposal.
3. Operator gives explicit approval.
4. Assistant/operator executes the approved basket.
5. Reconcile, mirror, notify, and refresh reporting.
6. If a leg cancels or broker state degrades, use the recovery/reporting surfaces before attempting another round.

The system may generate suggestions, summaries, and reproposals automatically. It does **not** remove the approval boundary for live trading.

---

## Prerequisites

- IB Gateway is running via the pinned native path described in `TOOLS.md`.
- GUI login / 2FA is complete if required.
- Broker readiness is healthy enough for the intended path.
- The portfolio state is current enough to trust:
  - `portfolio/<portfolio>/portfolio.md`
  - `portfolio/<portfolio>/holdings.md`
  - `portfolio/<portfolio>/trades.md`
  - `portfolio/<portfolio>/history.md`
- Reporting surfaces are fresh enough to review.

Useful checks:

```bash
node scripts/check-interactive-brokers-readiness.js
node scripts/run-health-check.js portfolio/etf --dry-run
node scripts/regenerate-dashboard.js portfolio/etf
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run
```

---

## Stage 1 — Propose a basket

```bash
node scripts/propose-basket.js --portfolio=etf
```

What it does:
- reads approved instruments + targets
- reads current holdings and cash posture
- computes a bounded proposal envelope
- writes a proposal artifact under `runtime/basket-proposals/<portfolio>/`

What to review before approval:
- instruments included
- sizing / quantity sanity
- price limits / bands
- blocked legs
- residual cash posture
- whether any broker-readiness or subscription caveats are already known

Operator note:
- if the proposal looks wrong, regenerate or adjust the inputs; do not push through approval just to “see what happens”

---

## Stage 2 — Approve explicitly

The live lane remains approval-gated.

Approval should happen only after reviewing:
- proposal preview
- dashboard/operator queue
- health check output if broker state or delivery state looks questionable

Useful review surfaces:

```bash
node scripts/generate-portfolio-summary.js --portfolio=etf
node scripts/run-health-check.js portfolio/etf --dry-run
```

Review these artifacts when needed:
- `portfolio/etf/summary.html`
- `portfolio/etf/health-report.html`
- `runtime/overview/approvals-queue.html`
- `runtime/overview/delivery-status.html`

---

## Stage 3 — Execute the approved basket

Canonical end-to-end path:

```bash
node scripts/execute-approved-basket-end-to-end.js
```

Typical behavior:
- loads the latest approved/proposed execution context
- submits/stages through the approved lane
- monitors/reconciles broker state
- mirrors trade outcomes back into repo state
- refreshes reporting state
- emits reproposal/recovery context if required

Important rule:
- do not treat a submitted order as complete until reconciliation and mirrored state agree

---

## Stage 4 — Reconcile and refresh reporting

After execution activity, refresh the operator surfaces if they are not already refreshed by the runner:

```bash
node scripts/run-health-check.js portfolio/etf
node scripts/generate-portfolio-summary.js --portfolio=etf
```

What this gives you:
- updated `health-report.*`
- updated `summary.*`
- refreshed overview artifacts
- current operator queue / delivery status / retry state

---

## Reproposal / retry path

If legs cancel or are requeued, use the surfaced recovery state instead of improvising.

Helpful surfaces:
- `runtime/overview/approvals-queue.html`
- `runtime/overview/daily-summary.html`
- `portfolio/etf/health-report.html`

What to look for:
- stale approvals needing reapproval
- blocked retry reasons
- broker recovery blockers
- delivery backfill review state
- circuit-breaker warnings for repeated cancels

If the system generated a reproposal, review it as a new approval decision rather than assuming it is safe to re-send unchanged.

---

## If broker readiness is degraded

Do **not** keep pushing live execution steps when readiness is degraded.

Typical symptoms:
- `ECONNREFUSED 127.0.0.1:4001`
- fallback-required readiness
- broker automation paused after repeated errors
- missing subscription / contract-quality warnings

Recommended sequence:

```bash
node scripts/check-interactive-brokers-readiness.js
node scripts/run-health-check.js portfolio/etf --dry-run
```

If native socket connectivity is down, the known-good launcher is:

```bash
/home/ubuntu/ibgateway-native/start-ibc.sh
```

Then:
1. restore login/2FA if needed
2. rerun readiness
3. rerun health check
4. only then revisit live execution

---

## Circuit breakers and repeated cancels

Circuit breakers exist to stop repeated bad retries from becoming silent loops.

Relevant runtime path:
- `runtime/circuit-breakers/<portfolio>/`

Meaning:
- repeated cancel patterns can mark an instrument as operator-review-only
- active breakers should not be cleared casually
- only clear after the underlying cause is understood and fixed

Useful helper:
```bash
node scripts/clear-circuit-breaker.js --portfolio=etf --instrument=<ticker-or-isin>
```

Only use that after confirming the subscription/liquidity/contract issue is genuinely resolved.

---

## Delivery and reporting follow-up

After a real execution round, also check whether any fill-notification backfill review is pending.

Relevant surfaces:
- `runtime/overview/delivery-status.html`
- `portfolio/etf/summary.html`
- `runtime/fill-notifications-state.json`

If the queue shows `backfill_review`, resolve that delivery workflow before treating the round as fully closed.

---

## Useful maintenance helpers

### Health check
```bash
node scripts/run-health-check.js portfolio/etf --dry-run
node scripts/run-health-check.js portfolio/etf --send-email
```

### Portfolio digest
```bash
node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run
```

### Runtime cleanup
```bash
node scripts/cleanup-runtime-artifacts.js --portfolio=etf --dry-run
node scripts/cleanup-runtime-artifacts.js --portfolio=etf
```

Cleanup is conservative and only removes stale superseded/generated runtime artifacts.

---

## Operator contract

- live execution still requires explicit approval
- do not bypass broker-readiness warnings
- do not clear active circuit breakers without understanding the cause
- do not assume email/report delivery succeeded without checking the surfaced status
- when dashboard/health/summary disagree, regenerate and trust the newest broker-backed state

The assistant can automate a lot of prep, reporting, and reconciliation, but it should not be used to smuggle a risky trade through unclear runtime conditions.


## Stable resting-state maintenance

When the repo is in a leave-behind state, prefer these checks before changing anything:

```bash
node scripts/test-artifact-writer.js
node scripts/test-resting-state-artifact-writes.js
node scripts/verify-repo.js
```

If verification re-dirties only `runtime/events/runtime-events.jsonl` or `runtime/execution-state.json`, treat that as expected ephemeral churn unless the content indicates a real regression.
