# Open Phases Overview — 2026-05-30 08:05 UTC

> Filtered to **non-fully-complete** work only.
> Rebuilt from **git history + current verification state**, because the previous overview had drifted behind the actual implementation commits.

---

## Visual roadmap

```text
Done backlog ────────────────────────────────────────────────────────────────┐
                                                                            │
Open now                                                                    ▼

next-3 session-aware retry ergonomics   [VERIFYING]  ████████░░
Roll-up D auto-remediation decision     [WAITING]    ██░░░░░░░░
Mailgun inbound infra                   [WAITING]    ██░░░░░░░░
Spec §1 closeout                        [PARTIAL]    ████████░░
FX cash reconciliation (Graham WIP)     [PARKED]     ██░░░░░░░░
```

Legend:
- `VERIFYING` = code landed; final validation / doc closeout in progress
- `WAITING` = blocked on a decision/external access
- `PARTIAL` = umbrella item with implementation mostly complete but closeout still open
- `PARKED` = intentionally not taken over

---

## Executive summary

### Git-truth corrections applied
- **R6 is already complete in git** (`5dc2723`, following implementation commit `b72519f`).
- **next-1 is already complete in git** (`8f0dfce`).
- **next-2 is already complete in git** (`b398c85`).
- **phase 5 is already complete in git** (`2159330`).
- The prior open-phase overview was stale and overstated the remaining engineering backlog.

### Active implementation lane
1. **next-3 — session-aware retry ergonomics**
   - Shared order-preparation helper exists.
   - Diagnostics and market-open submission paths use it.
   - Focused verification is green.
   - Broader verification is being rerun to support formal closeout.

### Actual remaining non-complete items
1. **next-3 verification + doc closeout**
2. **Roll-up D decision** (not an implementation gap)
3. **Mailgun inbound infra** (external access gap)
4. **Spec §1 closeout** after verification/docs are fully aligned
5. **FX cash reconciliation** remains Graham-owned WIP and untouched

---

## Detailed open-phase checklist

---

## next-3 — Session-aware retry ergonomics
**Plan:** `plans/phase-next-3-session-aware-retry-ergonomics.md`
**Status:** VERIFYING
**Plan commit:** `f4160fc`

### Goal
Make executable-row → prepared-order conversion explicit and reusable, while preserving timing-policy behavior and side-effect-free dry-run/diagnostic flows.

### Completed
- [x] Shared helper exists in `src/execution/orderPreparation.js`
- [x] Diagnostics path uses shared helper
- [x] Market-open submission path uses shared helper
- [x] Focused helper/regression coverage exists:
  - `scripts/test-order-preparation.js`
  - `scripts/test-submit-open-uses-approved-primary-exchange.js`
  - `scripts/test-execution-diagnostics-helper.js`

### Started
- [x] Focused verification rerun completed green
- [x] Safe-lane rerun started
- [x] Full `npm test` rerun started
- [x] Documentation reconciliation in progress

### Still open
- [ ] Capture final safe-lane result
- [ ] Capture final `npm test` result
- [ ] If both are green, commit/push doc closeout and mark phase complete

### Risks / traps
- Shared preparation logic must not mutate source rows
- Timing defaults must remain intact for venue-aware retry cases
- Closeout should not disturb Graham-owned WIP

---

## Roll-up D — auto-remediation promotion
**Status:** WAITING ON DECISION

### Completed
- [x] Guidance/self-heal posture exists
- [x] Health/reporting surfaces are in place

### Still open
- [ ] Decide whether any self-heal action should graduate from guidance to operator-approved automation

### Recommendation
- **Defer** until more soak evidence exists

---

## Follow-up #2 — Mailgun inbound infra
**Status:** WAITING ON EXTERNAL ACCESS

### Completed
- [x] Inbound code path exists
- [x] Tests exist

### Still open
- [ ] Create Mailgun receiving route
- [ ] Expose public webhook endpoint/tunnel
- [ ] Set webhook secret in gateway config
- [ ] Run signed inbound integration test

### Recommendation
- **Park** unless email-reply approval flow is needed immediately

---

## Spec §1 — live execution lane closeout
**Status:** PARTIAL

### Completed
- [x] Live execution path exists and has been used successfully
- [x] R6 landed terminal-evidence fallback
- [x] next-1 / next-2 / phase 5 landed in git
- [x] next-3 implementation appears landed

### Still open
- [ ] Finish verification/documentation closeout for next-3
- [ ] Reconcile phase overview docs with git truth
- [ ] Then mark Spec §1 closeout complete if no new regressions appear

---

## FX cash reconciliation (Graham WIP)
**Status:** PARKED / NOT IN AUTONOMOUS SCOPE

### Completed
- [x] Known overlapping WIP lane identified

### Still open
- [ ] Graham-owned changes remain untouched

---

## Suggested next execution order

```text
1. Finish next-3 verification
2. Commit/push doc closeout
3. Reassess Spec §1 closure status
4. Leave Roll-up D waiting for decision
5. Leave Mailgun inbound infra waiting for external access
```
