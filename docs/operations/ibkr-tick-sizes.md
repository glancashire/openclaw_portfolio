# IBKR tick-size resolution (market rules)

**Status:** active since 2026-06-15
**Module:** `src/execution/marketRuleResolver.js`
**Test:** `scripts/test-market-rule-resolver.js` (safe lane)

## The problem this solves

IBKR contracts advertise a flat `minTick`, but the **binding** constraint on a
limit price is the venue's **market rule** — a price-tiered increment table. A
contract carries `marketRuleIds` (comma-separated) positionally aligned with
`validExchanges`. The valid tick for a given price depends on which price band
that price falls into, for the rule that governs the routing venue.

### The R2SC regression (2026-06-15)
- R2SC (SPDR Russell 2000, conid 159310437) on **LSEETF** reported `minTick=0.0005`.
- We placed a BUY limit at **GBP 65.486** (a clean multiple of 0.0005).
- IBKR returned the order **Inactive** = rejected: *"price does not conform to
  the minimum price variation for this contract."*
- Root cause: LSEETF uses **market rule 983**, which is tiered. Above **GBP 25**
  the increment is **0.01**, not 0.0005. 65.486 is not a multiple of 0.01.
- Fix at the time: round limit to **65.49** → accepted → filled (order 9173).

The old code guessed ticks from a single hardcoded table (`MARKET_RULE_1874`)
that did not match every venue. That is exactly the class of bug this module
removes.

## Market rule 983 (verified live 2026-06-15)
| price ≥ | increment |
|---|---|
| 0 | 0.0005 |
| 0.1 | 0.001 |
| 5 | 0.0025 |
| 10 | 0.005 |
| **25** | **0.01** |

## How the resolver works

`resolveTick({ contractDetails, price, venue, client, cacheDir })` resolves the
**binding** tick for a contract at a price, in this order:

1. **Pair** `marketRuleIds`↔`validExchanges` positionally → ruleId for the venue
   (`ruleIdForVenue`). SMART-aligned rule preferred when the exact venue is not
   matched; else first ruleId.
2. **Resolve the rule table** (`resolveRuleTable`): disk cache → live
   `reqMarketRule` via the broker client → static fallback table → none.
3. **Walk the table** for the price band (`incrementForPrice`).
4. If no rule resolves, fall back to the **coarser of** (`minTick`, a
   conservative price-tier heuristic) — never finer than the venue likely allows.

It **never throws** into the order path; a resolution failure degrades to a safe
(coarser-or-equal) tick.

### Caching
- Live rule tables cached under `runtime/broker-cache/market-rules/rule-<id>.json`
  (gitignored), TTL 30 days. Market rules are very stable.

### Static fallback rules (verified via reqMarketRule)
- `983`, `3051` — LSEETF / EU ETF tiered family (verified 2026-06-15)
- `1874` — IBIS2 / EBS / most EU ETF venues (verified 2026-05-29)

## Wiring

- **Native client** (`nativeClient.js`): new `fetchMarketRules(ruleIds)` using the
  `reqMarketRule`/`EventName.marketRule` API; contract-details normalizer now
  surfaces `minTick`, `marketRuleIds`, `validExchanges`.
- **Client** (`client.js`): `fetchMarketRules` passthrough.
- **Proposal generator** (`basketProposalGenerator.js`): accepts optional
  `tickResolverFn`; uses it for limit rounding, falls back to `pickTick`.
- **Execution runner** (`basketExecutionRunner.js`): pre-flight tick validation
  accepts optional `tickResolverFn`; falls back to static `tickForPrice`.
- **Scripts**: `propose-basket.js` and `execute-approved-basket-end-to-end.js`
  build a resolver via `makeTickResolver({ client })` and pass it through.

`makeTickResolver({ client, cacheDir })` returns
`async ({ conid, venue, currency, price }) => { tick, ruleId, source }` and
caches contract details per conid for the run.

## Verification
- Unit test `test-market-rule-resolver.js` covers tiered walk, venue pairing,
  cache/live/static precedence, the R2SC case, and resilience to a broken client.
- Safe lane: 255/255 passing.
- Live proof (2026-06-15): resolver pulled rule 983 **live** from IBKR and
  resolved 0.01 at GBP 65.16 (the rejected price), then served a second lookup
  from cache.

## Future-proofing notes
- Any new instrument/venue is handled automatically: ticks come from the
  contract's own `marketRuleIds`, resolved live, not a hardcoded assumption.
- If IBKR changes a rule, the 30-day cache TTL picks it up on refresh; delete the
  cache file to force an immediate re-fetch.
- To extend the offline fallback, add the verified rule to `STATIC_MARKET_RULES`.
