# Phase 2B — config truth and IBKR default centralization

Status: active  
Last updated: 2026-06-01 UTC

## Objectives
- Reconcile the current Phase 2 roadmap with repo reality now that `readWorkspaceEnv()` and `docs/config-matrix.md` already exist.
- Finish any remaining configuration-hardening work by centralizing IBKR loopback defaults in one reusable source where practical.
- Add/strengthen regression tests proving config precedence and loopback-only TLS guards remain safe.
- Refresh roadmap/checklist docs so they describe the real remaining work instead of stale open items.

## Risks / dependencies
- Config refactors can create subtle drift between loader defaults, docs, and operator-facing checks.
- IBKR defaults are safety-relevant; changes must preserve readonly-by-default and current live/paper port behavior.
- Documentation updates must not over-claim closure unless tests and source align.

## Actionable checklist
- [ ] Audit config/env/default sources and identify remaining duplication or stale roadmap claims.
- [ ] Add tests first for any newly centralized IBKR defaults/helpers and any missing precedence edge cases.
- [ ] Implement minimal config refactor to keep IBKR defaults/documented values aligned from one source.
- [ ] Verify loopback-only TLS guard coverage remains explicit and non-global.
- [ ] Update Phase 2 / overview / roll-up docs to reflect the actual completion state.
- [ ] Run focused tests, then broader verification relevant to the touched surfaces.
- [ ] Commit completed implementation and push.

## Acceptance criteria
- IBKR defaults are defined and consumed with less duplication or ambiguity than before.
- Tests cover the touched config/default behavior and pass.
- Docs/checklists accurately describe what Phase 2 did and what remains.
- No regression in existing env precedence or TLS guard behavior.
