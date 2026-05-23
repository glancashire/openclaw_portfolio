# Phase 219 — repo hygiene and operator-facing docs

## Objectives
- Finish the remaining cleanup work that supports a stable leave-behind repository state.
- Remove stale plan/document duplicates and make the operator-facing docs match the current implementation.
- Improve repository hygiene so future verification runs and evidence generation are easier to reason about.

## Risks / dependencies
- Documentation changes can drift from behavior if written before confirming the current code paths.
- Cleanup can accidentally remove evidence or artifacts that are intentionally versioned.
- Any `.gitignore` changes must not hide tracked versioned evidence or required workspace files.

## Actionable checklist
- [ ] Audit stale phase plan files and remove or rename duplicates that no longer reflect the current workflow.
- [ ] Add a pre-commit hook that runs the focused test subset before local commits.
- [ ] Refresh operator docs to describe the current dashboard, email, self-heal, and cleanup behavior.
- [ ] Update workspace notes for the current stable-state workflow and any known cleanup invariants.
- [ ] Add tests or script checks where docs reference concrete CLI behavior.

## Acceptance criteria
- Stale/duplicate plan files are cleaned up or clearly renamed.
- Operator docs match the implemented repository behavior.
- Repository hygiene is improved without hiding versioned evidence or breaking verification.
- Focused test coverage passes and the repo remains pushable in a stable state.
