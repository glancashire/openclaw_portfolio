# Current Plan

Date: 2026-06-02
Status: waiting

## Goal
Keep the live doc set small and truthful. Completed engineering phases stay in `archive/`; this file tracks only real open work, open decisions, and the order to resume when Graham says go.

## Visual roadmap

```text
Phase 1 operator surface cleanup and dashboard path cleanup   [DONE]     ██████████
Phase 2 artifact hygiene and legacy surface retirement        [DONE]     ██████████
Phase 3 usage and decision-support reporting                  [OPEN]     █░░░░░░░░░
Phase 4 OpenClaw maintainer contract                          [DONE]     ██████████
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
**Status:** COMPLETE (2026-06-02)

### Completed
- [x] Weekly/monthly investor report email uses the redesigned three-block template.
- [x] Daily digest email now uses the redesigned three-block template as well.
- [x] Test-governance, status, and repo-truth surfaces now exist and are green.
- [x] Retired the orphan dashboard-email helper trio to `archive/scripts/legacy-dashboard-email/`.
- [x] Added `docs/reporting-command-surface.md` as the canonical dashboard/report/email command surface.
- [x] Tightened `docs/operator-runbooks.md` into a shorter golden path with expected artifact checks.
- [x] Updated digest docs to the current `reportEmail.js` rendering path and explicit JSON/dry-run behavior.
- [x] Added regression coverage for the reporting command surface and digest docs.

### Started / already true
- [x] The legacy dashboard email path had already been identified as a separate surface.
- [x] The main execution/reporting command surfaces were already partially documented.
- [x] Decision made: retire the orphan dashboard helper trio rather than rewrite it.

### Still open
- [x] None - phase closed 2026-06-02.

---

## Phase 2 - Artifact hygiene and legacy surface retirement
**Status:** COMPLETE (2026-06-03)

### Completed
- [x] Historical phase plans live under `archive/phase-plans/`.
- [x] Repo-root cleanliness and plan/doc-truth tests exist.
- [x] Generated test-manifest and domain-summary artifacts already exist.
- [x] Decided to keep `scripts/execute-trades.js` as a deliberate failure shim. Rationale block added in-file. New regression test `scripts/test-execute-trades-shim-contract.js` locks in the exit-1 + obsolescence-message contract.
- [x] Tracked wrapper/compatibility scripts blessed in `docs/operations/wrappers-and-shims.md`. The 14 diagnostic-script forwarders are kept (locked in by `scripts/test-diagnostics-script-compat.js`).
- [x] Decision recorded: defer naming a separate generated-artifact idempotence verification lane. Existing checks already cover the surface.

### Started / already true
- [x] Current docs consolidation moved stale audit/task notes out of the live surfaces.
- [x] Diagnostic scripts already live under `scripts/diagnostics/` with compatibility coverage.

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
**Status:** COMPLETE (2026-06-03)

### Completed
- [x] Host-specific invariants are captured in `TOOLS.md`.
- [x] Repo orientation and test-governance docs exist.
- [x] Wrote canonical host contract `docs/operations/openclaw-host-contract.md` with a one-page matrix of channels / sandbox / cron delivery / restarts / approvals.
- [x] Top-of-file pointers added to `TOOLS.md`, `AGENTS.md`, `playbook.md`, and `docs/operations/repo-map.md`.
- [x] New regression `scripts/test-openclaw-host-contract.js` locks the contract surface (rows + cross-links + pointer presence).

### Started / already true
- [x] Current-vs-archive boundaries are now explicit in the doc set.

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

1. Phase 2 - artifact hygiene and legacy surface retirement
2. Phase 4 - OpenClaw maintainer contract
3. Phase 3 - usage and decision-support reporting
4. Phase 0 - external unblockers as soon as operator inputs are available
5. Phase 5 - only if explicitly reactivated

## Open decisions for Graham

1. IBKR quote posture: recommend doing runbook Step 6 first if live trading matters in the next session.
2. `scripts/execute-trades.js`: recommend keeping it as an explicit failure shim until a path-dependence audit is done, then remove it cleanly.
3. FX cash reconciliation: recommend reopening it only if current live operator use is still materially confused by cash/value math.
