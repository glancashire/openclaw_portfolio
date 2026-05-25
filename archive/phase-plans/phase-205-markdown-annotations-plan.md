# Phase 205 — Finish prior Phase 204 (Markdown annotation rendering)

## Objective
Commit the uncommitted `renderApprovalsQueueMarkdown` change that adds:
- `⚠️ Requires attention: degraded quote quality (...)` when `requiresOperatorAttention`.
- `Native deployment: CHF 2479.50, EUR 6910.20` when `currencyDeployment` is non-empty.

The code edit already exists in working tree from earlier session. Need to add regression test, run, and commit.

## Risks / dependencies
- `test-approvals-queue-basket-first.js` may have snapshot assertions that need loosening.

## Actionable checklist
- [ ] Add `test-approvals-queue-markdown-annotations.js` regression test.
- [ ] Verify existing `test-approvals-queue-basket-first.js` still passes.
- [ ] Commit.

## Acceptance criteria
- Regression test asserts the new bullets render correctly when the surface item carries the annotation fields.
- Existing tests stay green.
