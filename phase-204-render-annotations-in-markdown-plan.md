# Phase 204 — Render envelope annotations in approvals-queue.md

## Objective
Phase 203 wired `quoteQualitySummary`, `requiresOperatorAttention`, and `currencyDeployment` into the JSON-shaped surface items. The Markdown renderer for `runtime/overview/approvals-queue.md` doesn't yet show them. Update the renderer so an operator reading the Markdown file sees:

- `⚠️ Requires attention: stale_only quote(s) on leg-1` when applicable.
- `Native deployment: CHF 2479.50, EUR 6910.20` when applicable.

## Risks / dependencies
- Existing `test-approvals-queue-basket-first.js` may already snapshot fragments of the Markdown; we'll need to keep it tolerant.

## Actionable checklist
- [ ] Find the Markdown renderer for the approvals queue.
- [ ] Append two optional bullets per item when the fields are present and non-empty.
- [ ] Re-run focused suite; loosen any assertion that hard-codes the old line list.
- [ ] Add a regression test that confirms the new bullets render when fields are set.

## Acceptance criteria
- `runtime/overview/approvals-queue.md` items show attention + currency deployment when present.
- All 26 existing focused tests pass.
- New regression test asserts the new bullets appear in the rendered Markdown.
