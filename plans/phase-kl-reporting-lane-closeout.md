# Phase KL — Close out reporting/accounting/quote hardening lane

## Objective
Finalize the remaining interconnected reporting work that spans the earlier Phase I/J/K/L plans: conservative external last-close fallback, stronger approved-instrument identity mapping, explicit quote-symbol overrides, distinct holdings-vs-account P&L surfacing, and a read-only IBKR accounting snapshot path. Close this as one truthful implementation tranche because the remaining source changes are coupled in the current tree.

## Risks / dependencies
- The working tree includes pre-existing generated/runtime churn; stage only the source/tests/plans plus phase-relevant generated proof artifacts.
- Quote fallback must remain conservative and explicitly labeled; explicit overrides must outrank heuristics.
- IBKR accounting persistence must stay read-only and fail closed when broker connectivity is unavailable.
- Summary/dashboard/output contracts must stay consistent after async/reporting changes.

## Action checklist
- [ ] Confirm the remaining source delta for quote fallback, identity mapping, account P&L, and accounting snapshot work is internally consistent.
- [ ] Add/verify regression coverage for explicit metadata promotion, override precedence, shared P&L surfaces, and quote fallback behavior.
- [ ] Regenerate portfolio artifacts and verify EMUAA uses the explicit override path and market-close fallback when available.
- [ ] Run focused tests, safe lane, and repo verification until green.
- [ ] Commit and push the combined reporting-lane completion cleanly.
- [ ] Reconcile roadmap/task docs so this lane is marked complete and the next open autonomous phase is unambiguous.

## Acceptance criteria
- Reporting surfaces show both holdings unrealized P&L and account P&L vs deposited capital.
- Approved-instrument metadata exposes explicit quote overrides and quote resolution prefers them.
- EMUAA resolves through the explicit override/fallback path instead of stale snapshot pricing when fallback data is available.
- Read-only IBKR accounting snapshot support exists and fails closed when connectivity is unavailable.
- Verification is green and the reporting lane is committed/pushed with truthful scope.
