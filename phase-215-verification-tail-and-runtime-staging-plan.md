# Phase 215 Plan — Verification Tail Cleanup and Runtime Staging Ergonomics

## Objectives
- Resolve the awkward end-state where `npm test` appears to go quiet or stall after surfacing successful verification progress.
- Improve repository hygiene around tracked runtime evidence under `runtime/` while preserving the current artifact policy distinction between versioned evidence and ephemeral churn.
- Make the repo easier to leave in a stable operator-ready state and easier to refresh for later usage-evidence gathering.

## Current State
- Phase 214 left the repo in a healthy/stable state with committed operator-facing evidence surfaces.
- The broker path is healthy and summary delivery succeeded.
- Two files remain intentionally dirty as ephemeral runtime churn:
  - `runtime/events/runtime-events.jsonl`
  - `runtime/execution-state.json`
- `runtime/` is broadly ignored by `.gitignore`, but some `runtime/overview/*` and `runtime/ibkr/*` files are tracked/versioned, which forces `git add -f` during curated staging.
- `npm test` reported green progress multiple times but appeared to hang silently at the tail, making verification less crisp than it should be.

## Risks / Dependencies
- The test tail issue may be caused by an open handle, long-running child process, or a verifier script that completes work but fails to exit.
- Adjusting staging ergonomics must not accidentally start committing ephemeral runtime churn.
- Changes to verification wrappers can affect CI/operator expectations if they alter output format or exit semantics too aggressively.

## Actionable Checklist
- Inspect `package.json`, `scripts/verify-repo.js`, and any long-running verification helpers for open-handle / exit-tail behavior.
- Reproduce the quiet-tail behavior in a narrower command if possible.
- Add/adjust tests around verification completion behavior if practical.
- Improve runtime staging ergonomics without weakening artifact policy:
  - either document/automate forced staging of tracked runtime evidence
  - or refine ignore/layout behavior in a narrowly scoped way
- Add regression coverage for any new helper or policy behavior.
- Run focused tests for verification and artifact-policy paths.
- Run full `npm test` and confirm clean completion semantics.
- Commit and push the phase.

## Acceptance Criteria
- `npm test` completes cleanly with an unambiguous exit in normal successful runs.
- Versioned runtime evidence is easier to stage intentionally without broad accidental inclusion of ephemeral runtime churn.
- Artifact policy distinctions remain intact and tested.
- Full verification passes and the resulting repo state is easier to maintain while gathering usage evidence.
