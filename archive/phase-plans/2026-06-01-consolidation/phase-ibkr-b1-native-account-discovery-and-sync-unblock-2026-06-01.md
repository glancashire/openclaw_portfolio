# Phase IBKR-B1 — Native account discovery and sync unblock

Status: active  
Last updated: 2026-06-01 UTC

## Objectives
- Resolve the native IBKR account discovery path so the application layer can retrieve live accounts, positions, and ledger truthfully after successful socket authentication.
- Unblock holdings/accounting sync scripts so ETF dashboard/reporting surfaces can refresh from live broker data instead of stale/zeroed artifacts.
- Keep the fix conservative: improve read-only native discovery and fallback behavior without widening trading authority or hiding broker-state uncertainty.

## Risks / dependencies
- IBKR gateway behavior is partly external and event-order dependent; wrapper fixes must be validated against the live native socket, not just mocks.
- The raw native probe already works, so the failure is likely wrapper/session semantics (short-lived reconnects, client id behavior, or request ordering). A superficial patch could mask the real issue.
- Sync scripts have inconsistent argument expectations (`portfolio/etf` vs `etf`), so script-surface defects may compound broker-client defects.
- Reporting surfaces should not claim full recovery until live sync actually succeeds end to end.

## Actionable checklist
- [ ] Compare working raw native probe behavior with wrapper behavior and isolate the specific divergence.
- [ ] Add tests for native managed-account/account-discovery fallback behavior.
- [ ] Fix native account discovery so fetchAccounts returns live account ids reliably after auth.
- [ ] Re-run native client integration probes and sync scripts with correct script arguments.
- [ ] Refresh holdings/accounting artifacts and verify dashboard/reporting surfaces move off zero/stale states.
- [ ] Reconcile any script-surface inconsistencies discovered during the live repair.
- [ ] Run focused regression tests, then broader verification.
- [ ] Commit completed implementation and push.

## Acceptance criteria
- Native client account discovery succeeds in the application layer, not just in standalone raw probes.
- `sync-interactive-brokers-holdings` and `sync-ibkr-accounting-snapshot` complete successfully against the live native broker path.
- ETF dashboard/summary artifacts reflect broker-backed holdings/cash truth rather than zeroed fallback state.
- Tests cover the repaired native account discovery behavior and pass.
- No change broadens live trading authority or bypasses existing safety boundaries.

## Notes
- This phase is treated as a blocker-removal lane because stale/zero dashboard outputs undermine the remaining work.
- If the root cause turns out to be client-id/session semantics, prefer a targeted read-only discovery fix over broad transport churn.
