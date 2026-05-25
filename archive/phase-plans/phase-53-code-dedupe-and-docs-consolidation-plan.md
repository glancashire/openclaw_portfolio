# Phase 53 — Code Deduplication + Docs Consolidation

## Goal
Reduce duplicate/hard-coded code, and consolidate docs into a smaller, clearer set of maintained documents.

## Scope
This phase applies to the current workspace codebase (portfolio-manager). It will:
- identify obvious hard-coded or duplicated logic paths
- refactor safe duplicates into shared helpers
- remove or archive obsolete docs
- consolidate the active docs into a few topical files
- add a short `docs/migration_learnings.md` only if it is genuinely relevant to this repo

## Checklist
- [ ] Scan the codebase for duplicated parsing/formatting/routing logic
- [ ] Identify hard-coded trade/order lists and replace with shared data sources where safe
- [ ] Extract reusable helpers for repeated markdown/status/event handling
- [ ] Consolidate active docs in `docs/` into topical documents
- [ ] Archive/remove obsolete docs from `docs/`
- [ ] Create or update `docs/migration_learnings.md` only if useful for future agents on this repo
- [ ] Add/extend tests for refactored logic
- [ ] Run targeted tests
- [ ] Iterate until green
- [ ] Commit and push

## Proposed implementation path
1. Map the duplicated areas in `src/`, `lib/`, and `scripts/`.
2. Refactor the safest duplicate logic first (small shared helpers).
3. Replace any remaining hard-coded execution list with portfolio-backed data flow.
4. Review `docs/` and split into:
   - trading workflow
   - observability/runbooks
   - operational notes
   - migration learnings (if needed)
5. Delete/archive obsolete docs and update references.
6. Run the smallest meaningful test gates.

## Acceptance criteria
- Less duplicate logic in core execution/reporting paths.
- No obvious hard-coded trade execution list remains in the live path.
- Docs are smaller, clearer, and easier to navigate.
- Tests pass.
