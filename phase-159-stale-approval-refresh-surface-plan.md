# Phase 159 — Stale approval refresh surface and grouped approval clarity

## Goal
Close the operator gap around stale approvals by adding a canonical dry-run refresh surface, keeping reporting/summary queue splits truthful, and making the next safe operator action explicit without mutating trade rows.

## Current state
Several pieces of this phase already exist:
- stale approval classification exists in shared execution-state logic
- summary/dashboard surfaces already split fresh actionable approvals from stale approvals needing reapproval
- portfolio health/self-heal already recommends regenerating stale approvals

The missing piece is a canonical operator command to inspect stale approvals directly and return exact safe next-step guidance.

## Scope

### In scope
- add a shared stale-approval inventory helper surface suitable for CLI use
- add `node scripts/trade.js refresh-stale-approvals [portfolio-dir] [--json]`
- keep the command diagnostic-only and non-mutating
- return exact safe next-step guidance for regenerate / reapprove flow
- add focused regression coverage for the CLI output and guidance
- verify reporting/summary surfaces still reflect grouped stale-vs-fresh approval truth

### Out of scope
- mutating trade rows automatically
- auto-refreshing or auto-approving stale rows
- changing live execution policy
- reopening already-correct summary/dashboard grouping logic unless tests show drift

## Implementation steps
1. Inspect existing `staleApprovalInventory()` and related approval-state surfaces.
2. Add a canonical helper that returns stale approval inventory plus operator guidance in a stable shape.
3. Add `trade refresh-stale-approvals` to the unified trading CLI with JSON and readable text output.
4. Reuse existing classification data instead of duplicating stale-approval policy logic.
5. Add focused regression tests for the command output and exact next-step guidance.
6. Re-run summary/reporting contract tests that cover stale approval grouping.
7. Iterate until the targeted tests pass.

## Verification gates
- `node scripts/test-stale-approval-refresh-command.js`
- `node scripts/test-structured-summary-artifacts.js`
- `node scripts/test-trade-cli-surface.js`
- `node scripts/test-execution-command-surface-doc.js`

## Success criteria
- `trade refresh-stale-approvals` exists and is canonical
- command returns non-mutating stale approval inventory plus safe exact next steps
- reporting still distinguishes fresh actionable approvals from stale approvals needing reapproval
- focused tests pass
