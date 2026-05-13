# Phase 156 — Hardening, learnings capture, and regression coverage

## Goal
Turn the painful live-recovery path from 2026-05-13 into a documented, hardened, regression-covered workflow so future live execution does not require ad-hoc debugging.

## Key learnings to encode
1. Native IB order ids must come from `nextValidId`, but market-data request ids must be separate.
2. Conid-based native orders should not force conflicting symbol/currency metadata onto the contract.
3. Holdings sync must ignore zero-quantity FX helper rows and derive sane fallback values from native position `avgCost` when market price/value are absent.
4. Proposal/trade-log generation must parse real cash from holdings markdown and preserve truthful approval states.
5. Reconciliation must prefer exact row selectors (`dateTime` + instrument + action) to avoid historical broker-id collisions.
6. Operator surfaces should prioritize execution truth and stale approvals above delivery cleanup.
7. Native contract discovery can return multiple valid venue/currency variants for a single ISIN; raw detail extraction should preserve conid/symbol/localSymbol/primaryExch.

## Work plan
- [ ] Capture today’s learnings in `.learnings/LEARNINGS.md` and `.learnings/ERRORS.md`.
- [ ] Add/extend native contract discovery tests around raw `contractDetails` extraction and ISIN variant resolution.
- [ ] Add holdings sync regression to ensure FX helper rows are filtered from snapshots.
- [ ] Add an execution-path regression for conid orders using minimal contract metadata.
- [ ] Add a documentation note covering the safe live recovery flow and native-vs-portal contract lookup behavior.
- [ ] Run a focused hardening test slice over proposal, native client, holdings sync, and submission/reconciliation paths.
- [ ] Summarize what remains messy or deferred.

## Verification gates
- Targeted node test scripts pass.
- Direct inspection of docs/learning entries shows the new operational guidance.
- No claims of “hardened” without test evidence.
