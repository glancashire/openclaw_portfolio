# Current Plan

Date: 2026-06-02
Status: waiting

## Goal
Keep the live doc set small and truthful. Completed engineering phases stay in `archive/`; this file tracks only real open work, open decisions, and the order to resume when Graham says go.

## Visual roadmap

```text
Phase 1 operator surface cleanup and dashboard path cleanup   [OPEN]     ███░░░░░░░
Phase 2 artifact hygiene and legacy surface retirement        [OPEN]     ██░░░░░░░░
Phase 3 usage and decision-support reporting                  [OPEN]     █░░░░░░░░░
Phase 4 OpenClaw maintainer contract                          [OPEN]     █░░░░░░░░░
Phase 0 external unblockers and operator-owned gates          [WAITING]  ███░░░░░░░
Phase 5 parked product and domain explorations                [PARKED]   █░░░░░░░░░
```

---

## Phase 0 - External unblockers and operator-owned gates
**Status:** WAITING

### Completed
- [x] IBKR readonly reporting and holdings-sync paths are stable enough for normal read/report operations.
- [x] Recovery guidance exists in `docs/operations/ibkr-recovery.md`.

### Started / already true
- [x] The quote-posture failure has been narrowed to subscription/data-farm/operator-side diagnosis, not a generic read-path outage.

### Still open
- [ ] Complete IBKR runbook Step 6 and verify quote posture moves out of `unknown`.
- [ ] Re-test live order submission only after quote posture is healthy.
- [ ] Decide whether Control UI direct embedding is truly blocked or simply still-undiscovered source territory.

### Notes
- This phase is not autonomous until operator/external inputs land.

---

## Phase 1 - Operator surface cleanup and dashboard path cleanup
**Status:** OPEN

### Completed
- [x] Weekly/monthly investor report email uses the redesigned three-block template.
- [x] Daily digest email now uses the redesigned three-block template as well.
- [x] Test-governance, status, and repo-truth surfaces now exist and are green.

### Started / already true
- [x] The legacy dashboard email path has been identified as a separate surface.
- [x] The main execution/reporting command surfaces are already documented.

### Still open
- [ ] Decide whether legacy dashboard mail helpers (`send-portfolio-dashboard-email.js` and its wrappers) should be kept, rewritten, or retired.
- [ ] Write a short operator golden-path doc for the top day-to-day commands and expected artifacts.
- [ ] Reduce overlapping helper scripts or mark them diagnostics-only.
- [ ] Add explicit output-contract notes where operators still have to guess between human and JSON surfaces.

---

## Phase 2 - Artifact hygiene and legacy surface retirement
**Status:** OPEN

### Completed
- [x] Historical phase plans live under `archive/phase-plans/`.
- [x] Repo-root cleanliness and plan/doc-truth tests exist.
- [x] Generated test-manifest and domain-summary artifacts already exist.

### Started / already true
- [x] Current docs consolidation moved stale audit/task notes out of the live surfaces.
- [x] Diagnostic scripts already live under `scripts/diagnostics/` with compatibility coverage.

### Still open
- [ ] Decide whether `scripts/execute-trades.js` should be removed or kept as a deliberate failure shim.
- [ ] Audit tracked wrapper/compatibility scripts and either bless, archive, or remove them.
- [ ] Tighten source-vs-generated-vs-fixture boundaries where git churn is still high.
- [ ] Decide whether generated-artifact idempotence deserves a named verification lane.

---

## Phase 3 - Usage and decision-support reporting
**Status:** OPEN

### Completed
- [x] Dashboard, overview, health, fill, digest, and investor email surfaces already exist.
- [x] Cron health and guided-remediation truth already surface degraded states honestly.

### Started / already true
- [x] Usage/KPI themes were already identified in the 2026-05-30 project audit and roadmap work.

### Still open
- [ ] Add usage counters for report sends, failures, approval latency, readiness failures, broker degradation, and reconciliation lag.
- [ ] Add trend and KPI summaries to overview artifacts.
- [ ] Decide which metrics are operator-facing only and which belong in investor-facing outputs.

---

## Phase 4 - OpenClaw maintainer contract
**Status:** OPEN

### Completed
- [x] Host-specific invariants are captured in `TOOLS.md`.
- [x] Repo orientation and test-governance docs exist.

### Started / already true
- [x] Current-vs-archive boundaries are now explicit in the doc set.

### Still open
- [ ] Write a canonical OpenClaw host/config/delivery contract.
- [ ] Tighten responsibilities across `AGENTS.md`, `TOOLS.md`, `playbook.md`, and setup docs.
- [ ] Add one clear matrix for channels, sandboxing, cron delivery, restarts, and approvals.

---

## Phase 5 - Parked product and domain explorations
**Status:** PARKED

### Completed
- [x] FX cash reconciliation root cause was documented.
- [x] Control UI embedding was identified as a valid target but not an editable one.
- [x] Spitex transfer themes were explored at a strategy level.

### Still open
- [ ] Decide whether FX cash reconciliation should be reactivated for autonomous implementation or remain Graham-owned WIP.
- [ ] Decide whether Control UI direct embedding becomes real backlog once editable source is available.
- [ ] Decide whether the Spitex exploration track is a real product lane or archive-only research.

---

## Recommended execution order when Graham says go

1. Phase 1 - operator surface cleanup and dashboard path cleanup
2. Phase 2 - artifact hygiene and legacy surface retirement
3. Phase 4 - OpenClaw maintainer contract
4. Phase 3 - usage and decision-support reporting
5. Phase 0 - external unblockers as soon as operator inputs are available
6. Phase 5 - only if explicitly reactivated

## Open decisions for Graham

1. IBKR quote posture: recommend doing runbook Step 6 first if live trading matters in the next session.
2. Legacy dashboard mail helpers: recommend retiring or archiving them unless there is a real event-driven use case to preserve.
3. `scripts/execute-trades.js`: recommend keeping it as an explicit failure shim until a path-dependence audit is done, then remove it cleanly.
4. FX cash reconciliation: recommend reopening it only if current live operator use is still materially confused by cash/value math.
