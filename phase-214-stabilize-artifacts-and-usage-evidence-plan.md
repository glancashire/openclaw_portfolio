# Phase 214 Plan — Stabilize Generated Artifacts and Usage Evidence

## Objectives
- Bring the repo back to a controlled stable state after Phase 213 verification and gateway keepalive activity.
- Distinguish canonical generated artifacts worth committing from transient runtime state that should be left uncommitted or ignored.
- Preserve useful usage evidence for the current stabilized system state, especially dashboard/summary/overview outputs that help operator review.
- Ensure the workspace can be left alone for a while without ambiguity about current health, delivery posture, and generated evidence.

## Current State
- IBKR native gateway is healthy again (`api_ready`) with live/realtime market data available.
- `master` already contains the Phase 213 source/test changes.
- The worktree is dirty from verification/regeneration and keepalive state updates, mainly under:
  - `portfolio/acceptance-closure/`
  - `portfolio/etf/`
  - `runtime/overview/`
  - `runtime/events/`
  - `runtime/execution-state.json`
  - `runtime/ibkr/native-gateway-keepalive-state.json`

## Risks / Dependencies
- Some runtime files are evidence and should be retained; others are transient and may create noise or unstable diffs.
- Regenerating artifacts can update timestamps/content again, so cleanup must be sequenced carefully.
- Changing ignore rules blindly could hide useful operational evidence.
- The stable resting state must not weaken auditability or break existing tests/contracts.

## Actionable Checklist
- Inspect the dirty generated/runtime files and classify them:
  - canonical generated report artifacts to commit
  - transient operational state to leave uncommitted or ignore
  - files needing regeneration for consistency
- Review `.gitignore` and existing artifact policy/tests before changing tracking behavior.
- If needed, update ignore policy or artifact-generation behavior so ephemeral files do not keep dirtying the tree unnecessarily.
- Regenerate the canonical overview/report surfaces in one controlled pass.
- Add or update tests covering any new artifact-policy or stabilization behavior.
- Run focused checks for artifact policy / generated-state behavior.
- Run full `npm test`.
- Commit the stabilization phase and push to remote.

## Acceptance Criteria
- The repository ends the phase in a deliberate stable state with canonical generated evidence committed as appropriate.
- Ephemeral runtime state is either intentionally left out of version control or managed in a way that does not create accidental churn.
- Usage evidence for the current system state is available in the committed/generated operator surfaces.
- All relevant tests pass, including full `npm test`.
