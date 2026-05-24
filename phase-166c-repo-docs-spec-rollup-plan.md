# Phase 166c — Repo Documentation, Specification, and Roll-up Plan

## Objectives
- Reconcile the active repository documentation with the codebase as it exists now, not as earlier closure docs described it.
- Update the core specification/progress/implementation documents so they reflect currently implemented features and current operational posture.
- Tidy obsolete, superseded, or completed planning material by consolidating what still matters into a new roll-up plan and checklist.
- Preserve historical phase files as audit artifacts where useful, but stop treating stale status summaries as current truth.

## Current State / Findings
- `SPECIFICATION.md`, `SPEC_PROGRESS.md`, `IMPLEMENTATION_PLAN.md`, and `ALL_PHASE_PLANS_CONSOLIDATED.md` are partially stale relative to the later repo phases and present command/reporting surfaces.
- The docs tree contains useful operator-facing material, but several files are behind the actual feature surface and naming conventions now present in scripts/runtime/reporting.
- The repo contains a very large number of phase plans, many of which are historical and completed; the main issue is not their existence, but that there is no clean current roll-up of what remains relevant.
- Current implemented features now clearly include:
  - native/skill-backed IBKR connectivity and contract-aware execution diagnostics
  - execution authority / preflight / delivery posture command surfaces
  - structured summary/dashboard/overview artifacts
  - investor-facing portfolio/fill/health email reporting redesign
  - health/self-heal/reporting/digest surfaces
  - strong verification coverage via `npm test`
- New in-progress work exists around market-calendar persistence/sync and should be reflected as active outstanding work, not hidden.

## Risks / Dependencies
- Repo-wide documentation edits can drift into vague marketing unless every claim is grounded in code/scripts/docs already present.
- We should not delete historical plan files casually; they still provide traceability. The right fix is to reduce their “current truth” role and replace that with one maintained roll-up.
- Several docs refer to old phase numbers or closure boundaries; those references need careful cleanup to avoid breaking useful historical context.
- The work should avoid broad code changes unrelated to documentation truth, except for stabilizing the current in-progress market-calendar branch if required for consistency.

## Actionable Checklist
- [ ] Audit the current repository truth across:
  - core spec/progress docs
  - docs/ operator guides
  - package script surface
  - reporting/execution/runtime feature areas
  - active/new outstanding work from recent phase plans
- [ ] Update `SPECIFICATION.md` so the implementation-oriented spec reflects the current product surface and guardrails.
- [ ] Update `SPEC_PROGRESS.md` to reflect the current implementation state and remaining gaps accurately.
- [ ] Update `IMPLEMENTATION_PLAN.md` and/or `ALL_PHASE_PLANS_CONSOLIDATED.md` so they stop implying earlier closure is the end of meaningful work.
- [ ] Create a new roll-up plan document that aggregates still-relevant outstanding work with a checklist and clear grouping.
- [ ] Update the most user-facing docs in `docs/` to reflect the current command/reporting/observability/report-delivery surface.
- [ ] Add or update tests where practical for documentation/spec contract claims if existing doc-contract tests cover those files.
- [ ] Run focused verification.
- [ ] Run full `npm test`.
- [ ] Clean unrelated churn, commit, push, and present the resulting file set.

## Acceptance Criteria
- Core repo docs describe the current implemented system truthfully.
- Obsolete or superseded “current status” summaries are replaced by one clear roll-up of remaining relevant work.
- A new roll-up checklist exists for outstanding work.
- Full test suite passes and repo truth is documented clearly enough for the next implementation wave.
