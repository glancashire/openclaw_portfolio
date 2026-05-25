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
- [x] Inspect current branch, remotes, uncommitted state, and remaining unfinished phases.
- [x] Create this Phase 23 plan file in repo root.
- [x] Commit the Phase 23 plan file.
- [x] Run an end-to-end acceptance sweep for the in-scope MVP workflow:
  - [x] create a new draft portfolio end-to-end
  - [x] validate draft-state activation blocking end-to-end
  - [x] verify guided intake / next-question workflow end-to-end
  - [x] verify ETF shortlist + approval-gating surface end-to-end
  - [x] verify dry-run rebalancing / proposal generation end-to-end
  - [x] verify execution-surface and safety-block behavior end-to-end
  - [x] verify dashboard / history / report refresh end-to-end
- [x] Patch any code or test regressions revealed by the sweep.
- [x] Add or strengthen focused acceptance/closure tests where evidence is missing.
- [x] Run the relevant targeted test set for this phase.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update implementation/progress/checklist docs to reflect final closure evidence and any intentionally out-of-scope limits.
- [ ] Commit the completed Phase 23 work.
- [ ] Push the plan and implementation commits if remote push is possible.
- [x] Verify whether any unfinished phases remain; if none, summarize final closure evidence.

## Intended verification
- Acceptance-sweep commands covering the main repo workflows
- New focused acceptance/closure regression test(s) if needed
- Existing verification bundles including execution/reporting/scheduling/rebalancing surfaces
- Git status/log inspection plus updated closure docs

## Verified outcomes
- The end-to-end acceptance sweep now passes for the in-scope ETF-only / CHF-first / IBKR read-only + dry-run MVP workflow.
- New draft portfolio creation, draft blocking, and guided next-question surfacing were verified end-to-end using `portfolio/acceptance-closure/`.
- ETF shortlist generation and approval-gated instrument workflow were verified end-to-end against the active ETF portfolio.
- Dry-run proposal generation, safety controls, generated-state checks, and weekly report-cycle refresh were verified end-to-end.
- The remaining integration regression was fixed: optional browser-session Playwright support no longer breaks non-browser proposal paths during module load.
- Added `scripts/test-optional-playwright-fallback.js` to lock the optional-dependency behavior in place.
- Repo closure docs now reflect that acceptance is complete for the read-only + dry-run MVP, while transmitted writable live execution remains an explicit follow-up lane rather than an unclosed implementation phase.
