# Open Phases Overview — 2026-05-28 15:32 UTC

> Filtered to **non-fully-complete** work only. Completed phases are intentionally omitted.
> Source basis: `PHASE_OVERVIEW.md`, current plan files under `plans/`, current git log, and latest verified execution/test results.

---

## Visual roadmap

```text
Done backlog ────────────────────────────────────────────────────────────────┐
                                                                            │
Open now                                                                    ▼

R6 terminal-order evidence fallback     [STARTED]   ███░░░░░░░
UBSPX next-1 timing/proposal hardening  [OPEN]      ░░░░░░░░░░
UBSPX next-2 reconciliation hardening   [OPEN]      ░░░░░░░░░░
UBSPX next-3 retry ergonomics           [OPEN]      ░░░░░░░░░░
Retry prep surface (phase 5)            [OPEN]      ░░░░░░░░░░
Roll-up D auto-remediation decision     [WAITING]   ██░░░░░░░░
Mailgun inbound infra                   [WAITING]   █░░░░░░░░░
Spec §1 edge-case hardening             [PARTIAL]   ██████░░░░
FX cash reconciliation (Graham WIP)     [PARKED]    ██░░░░░░░░
```

Legend:
- `STARTED` = plan committed and implementation has begun
- `OPEN` = planned but not yet started
- `WAITING` = blocked on a decision/external access
- `PARTIAL` = functionally present, hardening remains
- `PARKED` = intentionally not taken over

---

## Executive summary

### Active implementation lane
1. **R6 — Terminal order evidence fallback**
   - Why it matters: the old 5-leg basket run still has two stale `submitted` legs even though broker truth shows no open orders.
   - Current state: **started**.
   - Evidence:
     - `28ca347` fixed exact completed-order-id reconciliation in shared basket-run reconciliation.
     - `58adcbd` added the R6 plan.
     - Reconcile-only rerun still leaves 2 stale submitted legs, so exact-id evidence alone is not enough.

### Highest-value autonomous backlog after R6
2. **UBSPX retry hardening track** (`phase-next-1`, `next-2`, `next-3`, `phase 5`)
   - All are source/test-only and safe to execute autonomously.
   - These are the clearest path to fully closing the last **Spec §1** hardening gaps.

### Decisions that unlock the most
1. **Whether to batch-run the UBSPX hardening track now** after R6.
2. **Whether to promote any self-heal guidance into operator-approved automation** (Roll-up D).
3. **Whether to do Mailgun inbound infra setup** once account access / routing exists.

---

## Detailed open-phase checklist

---

## R6 — Terminal order evidence fallback
**Plan:** `plans/phase-r6-terminal-order-evidence-fallback.md`
**Status:** STARTED
**Latest commits:**
- `58adcbd` — plan committed
- `28ca347` — prerequisite exact order-id reconciliation hardening completed

### Goal
Close the remaining gap where a basket run can stay `submitted` after the broker no longer has an open order and no fill execution is present.

### Completed
- [x] Isolated the residual gap after R5.
- [x] Confirmed the stale run is still unresolved after a live `--reconcile-only` pass.
- [x] Identified relevant shared logic to reuse:
  - `src/execution/basketExecutionRunner.js`
  - `src/execution/tradeState.js`
  - `src/execution/lifecycleStatus.js`
- [x] Committed the implementation plan before coding.

### Started
- [x] Reviewed current basket lifecycle / reconciliation path.
- [x] Reviewed adjacent probable-cancelled / lifecycle normalization helpers for reuse.
- [x] Confirmed the desired fix belongs in shared reconciliation rather than dashboard-only cleanup.

### Still open
- [ ] Define the **minimum safe fallback heuristic** for terminal evidence.
- [ ] Add failing tests for strong-hint closure and anti-false-positive cases.
- [ ] Implement the fallback in shared basket-run reconciliation.
- [ ] Re-run targeted tests, safe lane, and full suite.
- [ ] Retry reconciliation against `basket-etf-20260528T1313-5legdiv`.
- [ ] If closure succeeds, verify dashboard/report posture and commit/push.

### Risks / traps
- Avoid symbol-only closure logic.
- Avoid contaminating unrelated old rows when broker identifiers are incomplete.
- Preserve fill precedence over cancellation heuristics.

### Unlock value
- Cleans the last obviously stale live execution artifact.
- Makes dashboard/operator posture more trustworthy.
- Reduces confusion before further execution hardening work.

---

## UBSPX Retry Hardening — Phase next-1
**Plan:** `plans/phase-next-ubspx-retry-hardening.md` (Phase 1)
**Status:** OPEN

### Completed
- [x] Phase plan exists.
- [x] Broad phase sequence and commit discipline already defined.

### Started
- [ ] Nothing yet in this phase implementation.

### Still open
- [ ] Review changed source/test files and remove dead artifacts.
- [ ] Lock proposal-distribution regression so UBSPX gets the buy when EMUAA is overweight.
- [ ] Lock target-gap deployment regression so asset-class proposals do not overspend cash.
- [ ] Lock native timing-field forwarding regression (`outsideRth`, `goodAfterTime`, `goodTillDate`).
- [ ] Lock execution timing-policy regression for UBSPX/IBIS (`DAY + goodAfterTime + outsideRth=false`).
- [ ] Run focused tests.
- [ ] Commit + push.

### Autonomous?
- **Yes.** Pure source/test work.

### Why this matters
- Stabilizes the cancelled UBSPX replacement path.
- Prevents timing-policy drift on retryable venue/session cases.

---

## Reconciliation & Audit-Trail Hardening — Phase next-2
**Plan:** `plans/phase-next-ubspx-retry-hardening.md` (Phase 2)
**Status:** OPEN

### Completed
- [x] Plan exists.
- [x] Related groundwork strengthened by R5 exact order-id reconciliation fix.

### Started
- [ ] Not formally started.

### Still open
- [ ] Inspect `reconcileOrderStatus` / trade-row matching path.
- [ ] Add regression for cross-row contamination / ambiguous hint matching.
- [ ] Add positive regression for legitimate strong-evidence probable-cancelled cases.
- [ ] Patch matching logic to require stronger instrument/quantity alignment.
- [ ] Run targeted tests.
- [ ] Run broader regression suite.
- [ ] Commit + push.

### Autonomous?
- **Yes.** Pure source/test work.

### Why this matters
- Prevents misleading historical reconciliation.
- Likely shares useful patterns with the current R6 lane.

---

## Session-Aware Retry Ergonomics — Phase next-3
**Status:** OPEN

### Completed
- [x] Goal is documented in the phase-sequence plan.

### Started
- [ ] Not started.

### Still open
- [ ] Extract reusable execution-timing helper module.
- [ ] Add unit coverage for pass-through default behavior.
- [ ] Add unit coverage for UBSPX/IBIS session-aware retry defaults.
- [ ] Add integration coverage proving `stagePortfolioOrder` forwards timing fields in dry-run.
- [ ] Reconfirm no write-side effects in dry-run.
- [ ] Run focused + broader tests.
- [ ] Commit + push.

### Autonomous?
- **Yes.** Pure refactor/test work.

### Why this matters
- Makes retry behavior explicit and easier to reason about.
- Reduces future drift between retry policy and actual staged payloads.

---

## Phase 5 — Explicit Retry Preparation Surface
**Status:** OPEN

### Completed
- [x] Goal is documented.

### Started
- [ ] Not started.

### Still open
- [ ] Introduce a prepare-order helper that merges instrument metadata + timing policy.
- [ ] Add unit coverage for metadata/timing preparation.
- [ ] Add integration staging coverage.
- [ ] Verify no write-side effects or approval-gate weakening.
- [ ] Run focused + full verification.
- [ ] Commit + push.

### Autonomous?
- **Yes.** Pure refactor/test work.

### Why this matters
- Gives retry prep a first-class surface instead of scattered ad hoc preparation.
- Should simplify later retry/session work.

---

## Roll-up D — auto-remediation promotion
**Status:** WAITING ON DECISION

### Completed
- [x] Guidance/self-heal posture exists.
- [x] Operational reporting is much stronger than before.

### Started
- [ ] No implementation should proceed until the decision is made.

### Still open
- [ ] Decide whether any self-heal action graduates from guidance to operator-approved automation.

### Decision that unlocks
- Approve or defer any candidate auto-remediation actions.

### Recommendation
- **Defer** until more soak evidence exists. Low urgency.

---

## Follow-up #2 — Mailgun inbound infra
**Status:** WAITING ON EXTERNAL ACCESS

### Completed
- [x] Code path exists.
- [x] Tests exist.

### Started
- [ ] Infra route not configured.

### Still open
- [ ] Create Mailgun receiving route.
- [ ] Expose public webhook endpoint/tunnel.
- [ ] Set webhook secret in gateway config.
- [ ] Run signed inbound integration test.

### Decision that unlocks
- Whether Graham wants to do the Mailgun dashboard / public routing setup now.

### Recommendation
- **Park** unless email-reply approval flow is needed immediately.

---

## Spec §1 — live execution lane hardening
**Status:** PARTIAL

### Completed
- [x] Live execution path exists and has been used successfully.
- [x] Approval intent / safe-word gate works.
- [x] Basket execution / lifecycle / mirror / notify path exists.
- [x] R4 improved post-live dashboard recommendations.
- [x] R5 improved exact-id basket reconciliation.

### Started
- [x] R6 is actively working the remaining stale-terminal edge case.

### Still open
- [ ] Finish basket/trade reconciliation edge-case hardening.
- [ ] Finish retry/session hardening track (`next-1..3`, `phase 5`).

### Recommendation
- Treat **R6 + UBSPX hardening track** as the concrete closure path for Spec §1.

---

## FX cash reconciliation (Graham WIP)
**Status:** PARKED / NOT IN AUTONOMOUS SCOPE

### Completed
- [x] Plan commit exists: `aaeb8c0`.
- [x] This lane is explicitly known to overlap with non-committed work.

### Started
- [ ] Not taken over by agent.

### Still open
- [ ] Graham-owned WIP in `src/brokers/shared/holdingsSnapshot.js` and related test scripts.

### Recommendation
- Leave untouched unless Graham explicitly hands over the lane.

---

## Autonomous actions already executed in this pass

- [x] Re-checked the active open-phase inventory against current plans.
- [x] Reconciled phase status against latest git history.
- [x] Confirmed R5 completion and R6 start state.
- [x] Produced this filtered open-phase breakdown file.

---

## Suggested next execution order

```text
1. Finish R6 terminal evidence fallback
2. Run UBSPX next-1 timing/proposal hardening
3. Run UBSPX next-2 reconciliation/audit-trail hardening
4. Run UBSPX next-3 retry ergonomics
5. Run phase 5 explicit retry prep surface
6. Reassess Spec §1 closure status
```

---

## Decisions that would materially unlock progress

### Needed from Graham
- [ ] **Run the UBSPX hardening batch after R6?**
  - Recommendation: **yes**
- [ ] **Promote any self-heal action to operator-approved automation?**
  - Recommendation: **not yet**
- [ ] **Do Mailgun inbound infra now?**
  - Recommendation: **only if email reply handling is needed soon**

If no contrary instruction arrives, the safest autonomous path is:
**finish R6, then continue through the UBSPX hardening sequence in order.**
