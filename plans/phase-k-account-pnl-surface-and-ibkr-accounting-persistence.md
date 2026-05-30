# Phase K — Account P&L surfacing and IBKR accounting persistence

## Objective
Show both holdings-unrealized P/L and whole-account P/L vs contributed cash in the dashboard/reporting surfaces, and add a broker-accounting persistence path that can pull useful accounting data (positions / average cost / fills where available) from IBKR when the broker is reachable.

## Current live constraint
- IBKR native connectivity is currently down again: `connect ECONNREFUSED 127.0.0.1:4001`.
- That means fresh broker-side average cost / trade reads cannot be truthfully performed right now.
- This phase must separate what can be implemented immediately from what requires IBKR recovery.

## Risks / dependencies
- Need to avoid hard-coding a user-contributed cash amount without a documented source.
- IBKR data surfaces may differ between native positions, executions, and ledger endpoints.
- Persistence must be read-only and deterministic; do not mutate trading state.

## Action checklist
- [ ] Add a surfaced account-level P&L metric distinct from holdings unrealized P&L.
- [ ] Choose a local source of truth for contributed cash (explicit config/artifact rather than memory in chat).
- [ ] Add a read-only IBKR accounting snapshot script/path for positions + avg cost + relevant trade/account data when connectivity is healthy.
- [ ] Persist useful broker accounting artifacts locally for later reporting reuse.
- [ ] Add tests for the new account-vs-holdings P&L presentation.
- [ ] Verify the current IBKR blocker explicitly and mark live sync as blocked until connectivity is restored.

## Acceptance criteria
- Dashboard/reporting surfaces can show both holdings unrealized P&L and whole-account P&L vs a documented contributed-cash figure.
- A read-only IBKR accounting persistence path exists and is safe to run when IBKR is reachable.
- Current runtime truthfully reports live IBKR sync as blocked while connectivity is unavailable.
