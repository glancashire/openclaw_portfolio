# Phase IBKR-B2 — Implementation plan: sync guard and false-zero protection

Status: active  
Last updated: 2026-06-01 UTC

## Objectives
- prevent overlapping IBKR read-sync jobs from interfering with each other
- stop holdings/accounting sync paths from overwriting known-good state with false-zero artifacts after degraded reads
- keep dashboard regeneration tied to successful sync flow so populated holdings are surfaced promptly

## Risks / dependencies
- live native IBKR sessions can behave differently under repeated short-lived connections versus overlapping calls
- stale lock handling must fail safely without leaving the sync path permanently blocked
- preserving last-known-good state must not hide a real empty portfolio if the broker genuinely reports zero positions
- dashboard regeneration should stay local and explicit, not trigger broad unintended work

## Actionable checklist
- [ ] add a small IBKR sync guard helper with stale-lock expiry and structured blocked result
- [ ] apply the guard to holdings sync and accounting snapshot sync entrypoints
- [ ] add regression tests for concurrent guard behavior and stale-lock recovery
- [ ] harden holdings sync so degraded live reads do not write false-zero holdings/cash over known-good state
- [ ] harden accounting snapshot writes with the same no-false-zero rule and machine-readable degradation reason
- [ ] make successful holdings sync regenerate the dashboard in the same controlled flow
- [ ] add focused regression tests for false-zero preservation and post-sync dashboard regeneration
- [ ] run focused tests and serial live verification

## Acceptance criteria
- overlapping sync attempts return a truthful already-in-progress/degraded result instead of writing zeros
- unexpected empty positions/ledger after successful auth do not overwrite known-good holdings/accounting artifacts
- successful sync regenerates dashboard promptly from fresh holdings state
- focused tests pass
- serial live verification remains populated and non-zero
