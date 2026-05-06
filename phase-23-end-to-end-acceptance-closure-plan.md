# Phase 23 — End-to-end acceptance closure plan

## Goal
Close the implementation plan by running a full acceptance sweep across the ETF-only, CHF-first, read-only + dry-run MVP workflow, fixing any integration regressions that surface, and tightening the repo’s closure artifacts so the roadmap and verification state are evidence-backed and internally consistent.

## Scope for this phase
- Inspect the current repo state, roadmap docs, and command surface for remaining acceptance gaps.
- Execute an end-to-end acceptance sweep covering portfolio creation, guided intake, validation, ETF approval gating, holdings sync shape, rebalancing analysis, dry-run trade proposal generation, execution-state verification, dashboard refresh, and report generation.
- Fix any code, test, or documentation regressions uncovered by that sweep while preserving ETF-only / CHF-first / IBKR read-only + dry-run safety boundaries.
- Add focused acceptance coverage and/or closure artifacts where evidence is currently too implicit.
- Update roadmap/progress/acceptance status docs so remaining limits are explicit and no stale “next phase” guidance remains.

## Actionable checklist
- [ ] Inspect current branch, remotes, uncommitted state, and remaining unfinished phases.
- [ ] Create this Phase 23 plan file in repo root.
- [ ] Commit the Phase 23 plan file.
- [ ] Run an end-to-end acceptance sweep for the in-scope MVP workflow:
  - [ ] create a new draft portfolio end-to-end
  - [ ] validate draft-state activation blocking end-to-end
  - [ ] verify guided intake / next-question workflow end-to-end
  - [ ] verify ETF shortlist + approval-gating surface end-to-end
  - [ ] verify dry-run rebalancing / proposal generation end-to-end
  - [ ] verify execution-surface and safety-block behavior end-to-end
  - [ ] verify dashboard / history / report refresh end-to-end
- [ ] Patch any code or test regressions revealed by the sweep.
- [ ] Add or strengthen focused acceptance/closure tests where evidence is missing.
- [ ] Run the relevant targeted test set for this phase.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update implementation/progress/checklist docs to reflect final closure evidence and any intentionally out-of-scope limits.
- [ ] Commit the completed Phase 23 work.
- [ ] Push the plan and implementation commits if remote push is possible.
- [ ] Verify whether any unfinished phases remain; if none, summarize final closure evidence.

## Intended verification
- Acceptance-sweep commands covering the main repo workflows
- New focused acceptance/closure regression test(s) if needed
- Existing verification bundles including execution/reporting/scheduling/rebalancing surfaces
- Git status/log inspection plus updated closure docs

## Verified outcomes
- Pending implementation.
