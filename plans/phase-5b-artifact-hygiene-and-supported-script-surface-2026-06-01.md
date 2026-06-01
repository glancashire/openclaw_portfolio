# Phase 5B — Artifact hygiene and supported script surface (2026-06-01)

## Objectives
- classify the current script surface into supported operator helpers vs diagnostics/debug tooling
- retire only clearly obsolete compatibility surface that is already documented as inactive
- reduce confusion around where probe/debug scripts should live without breaking operator muscle memory
- tighten artifact hygiene boundaries in docs/tests so future commits are less likely to pick up unrelated churn

## Risks / dependencies
- some top-level scripts may still be referenced by historical docs, tests, or operator habits even if they are obsolete
- moving scripts can break ad-hoc workflows unless compatibility wrappers remain in place
- deleting debug/probe tools too aggressively could remove useful broker diagnosis capability
- this phase should not broaden into functional broker/reporting changes; keep it surface- and hygiene-focused

## Actionable checklist
- [ ] inventory current debug/probe/compatibility scripts and group them into keep / move / retire
- [ ] confirm `scripts/execute-trades.js` is safe to retire or reduce further based on current repo references
- [ ] move obvious diagnostics/probe scripts under `scripts/diagnostics/` where that boundary is already established
- [ ] leave thin compatibility wrappers in `scripts/` only where low-risk and still helpful
- [ ] update operator/developer docs to make the supported surface vs diagnostic surface explicit
- [ ] add/extend focused tests for script compatibility and supported-surface documentation
- [ ] run focused verification and keep generated/runtime artifacts out of the commit

## Acceptance criteria
- the supported operator script surface is clearer in-repo than before this phase
- clearly obsolete compatibility surface is either retired or explicitly documented as unsupported
- moved diagnostics remain reachable through intentional compatibility wrappers when appropriate
- focused tests covering the new surface/hygiene rules pass
- the phase lands as a clean source/doc/test commit with no unrelated generated artifact churn
