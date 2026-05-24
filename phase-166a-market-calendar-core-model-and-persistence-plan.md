# Phase 166a — Market Calendar Core Model and Persistence Plan

## Objectives
- Establish a durable portfolio-scoped market-calendar artifact for approved instruments.
- Reuse the existing IBKR hours parsing/evaluation logic instead of duplicating it.
- Implement read/write/store helpers and normalization utilities without introducing live broker dependencies yet.
- Add tests that pin the artifact contract and degraded-state handling before the sync path is added.

## Current State / Findings
- `src/execution/executionDiagnostics.js` already contains the core hours helpers we need:
  - `parseHoursSegments(...)`
  - `evaluateHoursState(...)`
- Those helpers are currently embedded inside execution diagnostics instead of being available as a shared calendar utility.
- The repo already has established runtime artifact patterns under `runtime/...` and execution-state readers/writers under `src/execution`.
- Approved persisted instruments already include the identity fields needed for later sync phases, but 166a should stay broker-agnostic and focus on artifact shape, helper extraction, and persistence.

## Risks / Dependencies
- Extracting shared hours helpers must not regress existing execution diagnostics behavior.
- Artifact shape needs to be explicit now, because later phases will depend on it for sync, readiness, and cron automation.
- The store should be resilient to missing files, malformed JSON, and partial instrument records.
- We should avoid adding hidden coupling to current wall-clock time in tests.

## Actionable Checklist
- [ ] Extract shared market-hours normalization/evaluation helpers into a dedicated execution module.
- [ ] Update existing diagnostics code to consume the shared helper instead of the in-file copy.
- [ ] Add a market-calendar store module with helpers to:
  - resolve artifact path
  - read artifact safely
  - write artifact atomically
  - normalize instrument calendar rows
  - summarize coverage counters
- [ ] Define a stable artifact schema for portfolio-level market-calendar state.
- [ ] Add comprehensive tests covering:
  - parsing/evaluation parity with existing behavior
  - artifact read/write round-trip
  - normalization of raw instrument calendar entries
  - missing identity / malformed / missing file handling
  - coverage summary counts
- [ ] Run focused tests until green.
- [ ] Run full `npm test`.
- [ ] Clean unrelated churn, commit, and push phase 166a.

## Acceptance Criteria
- Shared calendar parsing/evaluation helpers exist and existing diagnostics continue to work.
- A dedicated market-calendar store module can read and write a portfolio-scoped artifact safely.
- The artifact contract is pinned by tests.
- Full test suite passes without regressions.
