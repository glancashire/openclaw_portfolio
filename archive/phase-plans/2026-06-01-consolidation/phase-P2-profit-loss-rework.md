# Phase P2 plan — profit/loss reporting rework stabilization

## Objectives
- Finish the in-progress profit/loss reporting rework across summary artifacts, digest email, and console/dashboard surfaces.
- Make the implementation coherent with the earlier decisions:
  - hybrid cost basis (trades.md first, IBKR avg cost fallback)
  - earliest known row as the all-time anchor
  - drift still available, but profit/loss becomes the primary user-facing emphasis
- Repair any regressions introduced by the partial implementation so pre-commit and safe-lane checks pass again.

## Risks / dependencies
- Existing partial changes already modify generated artifacts and reporting code; avoid mixing unrelated repo-audit work into this phase.
- Cost basis may be incomplete for some holdings; UI/reporting must degrade gracefully rather than invent numbers.
- Digest tests currently assert older copy/structure assumptions; update tests intentionally rather than bypassing them.
- FX reconciliation work is still separate and may affect CHF truth; P2 must consume the best available current numbers without clobbering that WIP lane.

## Actionable checklist
- [ ] Inspect partial P2 working-tree changes and determine intended final shape.
- [ ] Finalize cost-basis helper module and summary-artifact integration.
- [ ] Finalize dashboard/digest rendering changes so copy, sections, and ordering are intentional.
- [ ] Finalize console dashboard profit/loss presentation if needed.
- [ ] Add/update targeted tests for:
  - [ ] cost-basis computation
  - [ ] digest rendering
  - [ ] summary artifact structure / profit-loss payload
  - [ ] any dashboard surface regressions caused by new wording/order
- [ ] Run targeted tests until green.
- [ ] Run full `npm test` and then safe lane.
- [ ] Commit and push the completed P2 phase.

## Acceptance criteria
- Profit/loss data appears in summary artifacts and user-facing digest/dashboard surfaces as intended.
- Missing cost basis is handled explicitly and safely.
- Pre-commit checks, `npm test`, and safe lane pass.
- Phase is committed and pushed cleanly, without unrelated runtime/secrets noise.
