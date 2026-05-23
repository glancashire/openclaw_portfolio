# Phase 211 Plan — Workspace Cleanup + Diagnostics Organization

## Objectives
- Add a safe, testable cleanup path for stale runtime artifacts called out in the roadmap.
- Reduce script-root clutter by moving clearly diagnostic/probe-only scripts into `scripts/diagnostics/` with compatibility shims where needed.
- Preserve current operator workflows while making retention/cleanup behavior explicit and automatable.
- Keep cleanup work source-focused: no destructive pruning of active runtime state without conservative age/status gates.

## Risks / Dependencies
- Many runtime paths contain active operational state; cleanup logic must be age-gated and status-aware to avoid deleting live or investigatory artifacts.
- Some scripts may be referenced by docs/tests/cron/manual habits; moving them needs compatibility wrappers or path updates.
- The repo already has broad `runtime/` gitignore coverage, so the value here is operational hygiene rather than VCS correctness.
- Basket/circuit-breaker JSON schemas may vary slightly across files; retention logic should degrade safely on malformed or partial metadata.

## Actionable Checklist
- Inspect current basket proposal / approved basket / circuit-breaker artifact shapes and identify reliable retention signals.
- Add a reusable cleanup module for runtime retention decisions and file pruning.
- Add a CLI script for cleanup/GC with dry-run support and explicit retention windows.
- Move obvious probe/debug scripts into `scripts/diagnostics/` and leave thin compatibility entrypoints in `scripts/` where safer.
- Add focused tests for:
  - superseded basket retention pruning
  - approved basket retention pruning with status guards
  - cleared circuit-breaker retention pruning
  - cleanup dry-run reporting
  - moved diagnostics script compatibility
- Run focused cleanup tests, then full `npm test`.

## Acceptance Criteria
- A cleanup command can report and prune stale runtime artifacts conservatively, with dry-run output and tests.
- Diagnostics/probe scripts are better organized under `scripts/diagnostics/` without breaking existing test or operator entrypoints.
- Full test suite passes after the cleanup changes.
- Phase plan committed before implementation, and final implementation committed/pushed after verification.
