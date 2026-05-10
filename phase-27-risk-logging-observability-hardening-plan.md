# Phase 27 — Risk, Logging, and Observability Hardening Plan

Goal: improve trust in real operations through stronger runtime evidence, risk-limit visibility, and failure diagnosis.

## Scope

This phase closes the last explicit post-MVP roadmap lane by hardening three operator-facing areas:
1. structured runtime logging and retained runtime evidence
2. deeper risk-limit visibility and blocked-trade diagnostics
3. failure-drill and observability surfaces for degraded broker and stale-state conditions

The work must stay inside current repo constraints:
- no unsafe external side effects
- keep readonly / dry-run / transmitted-live safety boundaries intact
- prefer local artifacts and CLI verification over networked alerting changes

## Plan

### 1) Centralize structured runtime logging guidance and artifacts
- Add a shared runtime logging helper under `src/` for JSONL-style audit/event records.
- Standardize fields across execution/reporting/risk events: timestamp, level, category, action, portfolio, mode, status, summary, details.
- Write runtime events to a local artifact path under `runtime/` so operators have preserved evidence beyond Markdown summaries.
- Add a CLI helper to inspect recent runtime events with filtering/summarization.

### 2) Strengthen risk-limit visibility and operator diagnostics
- Extend safety/risk checks so failures return richer operator-facing diagnostics instead of only boolean blocking.
- Surface active risk posture in dashboard/report/readiness outputs, including explicit blocked reasons and breach metadata.
- Add a dedicated risk-observability check script for quick operator inspection.

### 3) Add safe failure-drill coverage for live-path edge cases
- Add simulated drills for broker degradation, stale data, missing approvals, and transmitted-live blocks.
- Verify structured runtime events are emitted for those conditions.
- Keep drills local-only and non-transmitting.

### 4) Improve observability docs and operator runbooks
- Add a focused observability doc covering broker degradation, stale data, risk-limit breaches, runtime logs, and blocked trading states.
- Link the doc from existing runbooks/config docs where operators would actually look.

### 5) Update verification bundles and status docs
- Extend the execution verification bundle or add companion checks for observability/risk logging posture.
- Update roadmap/progress/status docs so Phase 27 and overall closure status are explicit.

## Actionable checklist

- [ ] Create `src/observability/` helpers for structured runtime events
- [ ] Persist local runtime JSONL evidence under `runtime/`
- [ ] Add `scripts/show-runtime-events.js`
- [ ] Add `scripts/check-risk-observability.js`
- [ ] Enrich safety/risk outputs with operator diagnostics
- [ ] Surface risk/blocked-state observability in dashboard/report/readiness flows
- [ ] Add safe simulated failure-drill tests for observability logging
- [ ] Add/update docs for runtime logs and degraded-state diagnosis
- [ ] Add verification entry points in `package.json` / bundle scripts
- [x] Mark Phase 27 complete across roadmap/progress/report docs once verification passes

## Verification gates

Run and iterate until green:
- targeted observability/risk regression tests
- `npm run check:safety`
- `npm run verify:execution`
- any new observability/risk check commands added in this phase
- focused direct inspection of emitted runtime artifacts where needed

## Completion criteria

Phase 27 is complete when:
- operators can inspect recent runtime events locally
- blocked trade/risk states expose specific diagnostics in CLI and artifact surfaces
- simulated degraded conditions emit structured runtime evidence
- docs explain where to look and how to interpret blocked/degraded states
- roadmap/progress docs show no remaining explicit post-MVP phases
