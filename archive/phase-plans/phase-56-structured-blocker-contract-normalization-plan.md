# Phase 56 — Structured Blocker Contract Normalization

## Goal
Make the execution-policy blocker contract consistent everywhere so callers, tests, and docs all use the same structured shape.

## Checklist
- [ ] Audit callers/tests for assumptions that blockers are raw strings
- [ ] Normalize the remaining tests to read blocker `.message` values consistently
- [ ] Ensure `execute`, `stage`, and transmitted-live paths emit the same blocker shape
- [ ] Update any docs that still describe the old raw-string behavior
- [ ] Run the execution-surface safety tests
- [ ] Fix failures until green
- [ ] Commit and push

## Acceptance criteria
- blocker checks work with the structured policy output
- no test depends on a raw-string blocker array
- safety gates still fail closed
