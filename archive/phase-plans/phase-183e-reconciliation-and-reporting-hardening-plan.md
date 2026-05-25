# Phase 183E — Reconciliation and Reporting Hardening Plan

## Objectives
- Reconcile basket execution truth back into trade logs, holdings, history, dashboard, and summary artifacts automatically.
- Keep broker truth as the durable source after each basket run.
- Ensure basket-level state is reflected in repo surfaces without manual cleanup.
- Close the loop so the operator sees one coherent execution story after each run.

## Risks / dependencies
- Existing reporting surfaces are broad and sensitive to stale runtime artifacts.
- Reconciliation must not overwrite broker truth with inferred or pre-trade state.
- The basket runner must not break the current trade-row lifecycle model.
- Additional report refreshes may expose unrelated pre-existing workspace drift.

## Actionable checklist
- [ ] Add basket-run reconciliation hooks to refresh trade log, holdings, history, dashboard, and summary artifacts.
- [ ] Ensure successful and partially successful basket runs both emit coherent repo state.
- [ ] Add unit tests for reconciliation ordering and artifact refresh behavior.
- [ ] Add regression tests for partial basket runs and post-run refresh correctness.
- [ ] Run targeted tests, then repo verification.

## Acceptance criteria
- After basket execution, repo artifacts reflect broker truth and run state without manual patching.
- Partial runs still reconcile cleanly and preserve blocked/failed leg context.
- Dashboard and summary artifacts refresh consistently after execution.
