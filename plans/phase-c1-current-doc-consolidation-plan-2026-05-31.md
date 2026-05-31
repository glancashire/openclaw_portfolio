# Phase C1 — Current document consolidation

Status: active  
Last updated: 2026-05-31 UTC

## Objectives
- Replace the current spread of overlapping plans/checklists/progress docs with a concise, consistent current document set.
- Classify existing planning/status material into: canonical current, supporting current, historical archive, or obsolete scratch.
- Move historical and superseded documents out of the main current-working surface so future execution can follow one clean plan.
- Preserve traceability by archiving rather than deleting by default.

## Risks / dependencies
- Some documents still contain useful breadcrumbs or references even if they are no longer canonical.
- Moving files can break repo-map or cross-document references if not updated carefully.
- Runtime-generated status docs and portfolio-local recovery checklists should not be mixed blindly into project planning docs.
- Scratch/task files may contain useful recent thinking but are not automatically canonical.

## Actionable checklist
- [ ] Build a classification table for current planning/status documents.
- [ ] Define the new canonical current document set.
- [ ] Create or rewrite concise canonical docs for current plan, current checklist, and current status.
- [ ] Move superseded historical docs into a clear archive location.
- [ ] Remove or archive obsolete scratch planning docs that clutter the current surface.
- [ ] Update repo-map and any key pointers so the new current docs are easy to find.
- [ ] Verify references and inspect the resulting top-level/current planning surface.
- [ ] Commit and push the consolidation batch.

## Acceptance criteria
- There is a small, obvious current document set for ongoing work.
- Historical documents are preserved but no longer compete with current documents at the top level/current surface.
- Key references point to the new canonical docs.
- The repo is easier to resume from in a fresh session without reading stale plans.

## Initial classification hypothesis
Canonical current (expected):
- `ROLLUP_OUTSTANDING_PLAN.md`
- `spec-outstanding-checklist.md`
- `PROGRESS_REPORT.md`
- `SPEC_PROGRESS.md`
- one new archive index / current-docs guide if needed

Likely historical/archive:
- older wave/task plans under `tasks/`
- older phase plans not directly serving current execution
- scratch planning files under `tmp/`

Likely supporting/non-canonical:
- portfolio-local recovery checklists
- runtime overview status artifacts
- skill reference docs
