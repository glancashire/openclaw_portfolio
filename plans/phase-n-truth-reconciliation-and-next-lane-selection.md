# Phase N — Truth reconciliation and next-lane selection

## Objective
Reconcile the remaining phase/open-work tracking docs so they reflect the completed reporting/accounting/quote lane and the canonical spec truth, then explicitly point the autonomous workflow at the next real implementation phase from the roadmap.

## Risks / dependencies
- Many generated/runtime artifacts are dirty; keep this phase source/docs-only.
- Older phase overview docs may still describe pre-closeout state; update them without rewriting unrelated history.
- The next lane should be chosen from current roadmap truth, not stale historical plans.

## Action checklist
- [ ] Update open-work overview docs to mark the reporting/accounting/quote lane complete.
- [ ] Remove stale "Spec §1 decision-ready" language where canonical spec trackers already mark engineering complete.
- [ ] Update the audit harvester / roadmap pointer so the next open implementation lane is explicit.
- [ ] Verify doc-contract and policy tests still pass.
- [ ] Commit and push the truth-reconciliation phase.
- [ ] Start the next actual implementation phase with a fresh plan commit.

## Acceptance criteria
- `OPEN_PHASES_OVERVIEW.md` and `PHASE_OVERVIEW.md` no longer present completed reporting work as open.
- Repo truth points at roadmap hardening phases as the remaining autonomous work.
- Doc/policy verification remains green.
