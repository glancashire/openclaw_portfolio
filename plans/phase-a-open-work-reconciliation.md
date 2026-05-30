# Phase A plan — open work reconciliation

## Objectives
- Eliminate stale references that still describe already-landed work as open.
- Create one canonical, current summary of genuinely open work and decisions.
- Tighten the open-phase docs so later autonomous phases build on accurate state.

## Risks / dependencies
- Repo working tree is noisy with unrelated generated artifacts; stage carefully.
- Some older docs may intentionally preserve historical intermediate status; avoid rewriting history where a note should remain archival.
- Need to preserve the distinction between engineering-complete work and blocked decisions/infra work.

## Actionable checklist
- [ ] Inspect current open-work / phase docs for stale references.
- [ ] Update the docs that should reflect current live truth.
- [ ] Add or refine a canonical open-decisions/open-work source if needed.
- [ ] Add tests or doc-contract checks if a contract exists for these docs.
- [ ] Run focused verification for touched surfaces.
- [ ] Commit and push source/doc changes only.

## Acceptance criteria
- [ ] No active phase doc still incorrectly implies next-3 is an unfinished engineering lane.
- [ ] Spec §1 roll-up state is described consistently enough for the next decision phase.
- [ ] A reader can distinguish: done engineering, open decisions, blocked infra, and parked WIP.
