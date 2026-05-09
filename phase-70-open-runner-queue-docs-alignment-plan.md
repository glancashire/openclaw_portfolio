# Phase 70: Open-runner queue docs alignment plan

## Goal
Align the operator-facing docs with the now-implemented queue distinctions across command, summary, and dashboard surfaces so future operators and agents use first-handoff vs retry semantics consistently.

## Scope
- update maintained docs for queue-open vs requeue-open semantics
- document first-handoff vs retry reporting labels
- add a lightweight documentation verification check where practical

## Non-goals
- new features
- runtime behavior changes
- scheduler automation

## Implementation steps
1. Audit current operator/trading/observability docs for outdated queue language.
2. Update docs to describe first handoff vs retry paths consistently.
3. Add or extend a focused doc/render verification if there is a stable seam.
4. Re-run targeted doc-adjacent reporting/command checks.
5. Commit and push.

## Verification
- `node scripts/test-dashboard-command-center.js`
- `node scripts/test-structured-summary-artifacts.js`
- `node scripts/test-market-open-queue-command.js`
- `node scripts/test-market-open-requeue-command.js`

## Risks / watchouts
- Keep docs short and operational.
- Do not drift into speculative scheduler behavior.
