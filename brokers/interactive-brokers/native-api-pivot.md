# Interactive Brokers Native API Pivot

## Why pivot

The local Client Portal Gateway browser login succeeds, but authenticated API calls still fail because the required routed gateway cookies (`lb`, `xyzab`) are not exposed to the repo's server-side client or reliably shared into Playwright request contexts. This blocks durable read-only automation even after successful 2FA.

## Recommendation

Pivot the IBKR transport layer from Client Portal Web API to the native TWS / IB Gateway socket API for the read-only MVP.

## Benefits

- avoids fragile browser-cookie/session coupling
- better fit for durable local automation
- direct access to:
  - managed accounts
  - account summary / cash balances
  - positions
  - contract details / instrument search
  - market data snapshots / subscriptions
- keeps approval gates and Markdown workflow unchanged

## Proposed Node client candidates

1. `@stoqey/ib`
   - actively maintained Node/TypeScript client for TWS / IB Gateway
   - maps closely to official IBKR socket API concepts
2. `ib`
   - older but simpler Node client

Preferred first attempt: `@stoqey/ib`

## Minimal repo changes

Keep existing portfolio/reporting logic intact. Replace only the broker transport implementation behind the current `InteractiveBrokersClient` surface.

Current repo methods to preserve:
- `authenticate()`
- `fetchAccounts()`
- `fetchLedger(accountId)`
- `searchContracts(query)`
- `fetchMarketSnapshot(conids, fields)`
- `fetchPositions(accountId)`

## Proposed config changes

Extend `secrets/interactive-brokers.json` to support native mode:

```json
{
  "interactiveBrokers": {
    "mode": "native",
    "host": "127.0.0.1",
    "port": 7497,
    "clientId": 101,
    "accountId": "...",
    "readonly": true
  }
}
```

Notes:
- exact port depends on TWS vs IB Gateway and paper vs live setup
- keep `baseUrl` optional for legacy Client Portal fallback/testing only

## Proposed implementation steps

1. Add config support for `mode`, `host`, `port`, `clientId`, `readonly`
2. Add `nativeClient.js` wrapper around chosen Node package
3. Make `client.js` dispatch by mode:
   - `mode=client-portal`
   - `mode=native`
4. Implement read-only methods first:
   - connect/authenticate
   - accounts
   - positions
   - account summary / ledger mapping to CHF cash
   - contract search/details
   - market price snapshot
5. Keep order methods stubbed/blocked until approval gates are revisited
6. Update readiness script to report native socket connectivity separately from auth

## Expected mapping notes

Likely native API mappings:
- `fetchAccounts()` <- managed accounts
- `fetchLedger(accountId)` <- account summary / account updates stream normalized to current ledger shape
- `fetchPositions(accountId)` <- positions callback stream
- `searchContracts(query)` <- contract details / matching symbols workflow
- `fetchMarketSnapshot(conids, fields)` <- market data request normalized to current snapshot shape

## Risks

- native TWS/IB Gateway app may need separate installation/runtime and login handling
- market data permissions still depend on IBKR account entitlements
- socket API is event-driven, so wrapper code must gather async callbacks into promise-based methods

## Immediate next checks

1. Confirm whether TWS or native IB Gateway is installed or needs install
2. Confirm intended runtime target: paper or live
3. Stand up a read-only native connectivity smoke test before refactoring the repo client
