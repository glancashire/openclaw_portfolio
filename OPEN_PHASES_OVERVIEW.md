# Open Phases Overview — 2026-05-30 08:05 UTC

> Filtered to **non-fully-complete** work only.
> Rebuilt from **git history + current verification state**, because the previous overview had drifted behind the actual implementation commits.

---

## Visual roadmap

```text
Done backlog ────────────────────────────────────────────────────────────────┐
                                                                            │
Open now                                                                    ▼

Roll-up D auto-remediation decision     [WAITING]    ██░░░░░░░░
Mailgun inbound infra                   [WAITING]    ██░░░░░░░░
Spec §1 engineering closeout decision   [DECIDE]     ████████░░
FX cash reconciliation (Graham WIP)     [PARKED]     ██░░░░░░░░
Control UI direct embedding             [BLOCKED]    ██████░░░░
```

Legend:
- `WAITING` = blocked on a decision/external access
- `DECIDE` = implementation is landed; remaining work is an explicit closure decision
- `PARKED` = intentionally not taken over
- `BLOCKED` = implementation target exists conceptually, but the editable surface is unavailable

---

## Executive summary

### Git-truth corrections applied
- **R6 is already complete in git** (`5dc2723`, following implementation commit `b72519f`).
- **next-1 is already complete in git** (`8f0dfce`).
- **next-2 is already complete in git** (`b398c85`).
- **phase 5 is already complete in git** (`2159330`).
- The prior open-phase overview was stale and overstated the remaining engineering backlog.

### Active implementation lane
The remaining work is now mostly **truth maintenance, explicit closure decisions, and blocked external lanes** rather than unfinished execution-hardening code.

### Actual remaining non-complete items
1. **Roll-up D decision** (not an implementation gap)
2. **Mailgun inbound infra** (external access gap)
3. **Spec §1 engineering closeout decision** after doc alignment
4. **FX cash reconciliation** remains Graham-owned WIP and untouched
5. **Control UI direct embedding** remains blocked until the editable app source is available

---

## Detailed open-phase checklist

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
**Status:** DECISION READY

### Completed
- [x] Live execution path exists and has been used successfully
- [x] R6 landed terminal-evidence fallback
- [x] next-1 / next-2 / next-3 / phase 5 landed in git
- [x] Verification/doc reconciliation for the retry-hardening lane landed

### Still open
- [ ] Decide whether Spec §1 should now be marked fully complete for engineering scope
- [ ] If yes, update the remaining canonical spec-tracking surfaces to remove stale partial-status language
- [ ] If no, explicitly name the non-engineering criteria still being bundled into Spec §1 closure

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
1. Reconcile stale spec/open-work docs
2. Make the Spec §1 engineering closeout decision explicit
3. Leave Roll-up D waiting for decision
4. Leave Mailgun inbound infra waiting for external access
5. Leave FX cash reconciliation parked
6. Embed directly into Control UI only if editable app source becomes available
```
