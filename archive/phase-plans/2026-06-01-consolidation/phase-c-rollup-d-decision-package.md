# Phase C plan — Roll-up D decision package

## Objectives
- Turn the open Roll-up D auto-remediation question into an explicit operator-ready decision package.
- Separate low-risk reversible candidates from actions that should remain advisory/operator-only.
- Leave a concrete approval-ready checklist for future implementation if promotion is approved.

## Risks / dependencies
- Promoting the wrong action would widen autonomy in sensitive operational paths.
- The repo already has bounded self-heal guidance; the task here is classification and decision support, not unapproved automation.
- Must preserve current safety posture around broker/execution dependencies.

## Actionable checklist
- [ ] Inspect current self-heal and health guidance surfaces.
- [ ] Classify candidate actions by safety/reversibility/operator need.
- [ ] Document a recommendation and explicit approval boundary.
- [ ] Add any small supporting tests/doc assertions if a canonical doc is introduced.
- [ ] Commit and push the decision package.

## Acceptance criteria
- [ ] A reader can see exactly which actions are safe candidates, conditional candidates, or operator-only.
- [ ] The recommendation is explicit and conservative.
- [ ] No runtime automation is expanded without approval.
