# Fill pipeline closures, archived 2026-06-03 (late-afternoon batch)

These closures landed during the autonomous afternoon session of 2026-06-03,
between 14:29 (live basket execution) and 16:06 UTC (canonical name fix).
There are no plan documents here because the work was driven directly off
the post-execution reality. This README is the index.

## What landed

| Closure | Commit | Outcome |
|---|---|---|
| 20k Mag-7 deconcentration basket built + approved + executed live | `d7a7330` | 4 fills (XDEW, MWEQ, IS3H, DXS0); deposits ledger row 9 added |
| Per-instrument plain-English description in P/L card | `dcc971d` | `INSTRUMENT_DESCRIPTIONS` map in `dashboardDigest.js`; bold name + smaller `#6b7280` description sentence under each ticker |
| ISIN ↔ conid identity bridge in fill-notification readiness check | `a51a0d3` | `tradeNotificationEmail.js` uses `identityValues()` + `approvedInstruments` crosswalk; new `test-trade-notification-readiness-bridge.js` (3 cases) |
| `monitor-fills` cron job scheduled | `a51a0d3` | `*/15 7-21 * * 1-5 UTC`, current-session, delivery=none, tools=exec/read |
| Canonical instrument-name precedence fix | `cf56f87` | `approvedInstrument.name` wins over `holdingsMatch.name`; `monitor-fills.js` forwards `order.name` defense-in-depth; readiness-bridge test extended to 4 cases |

## Files touched (production)

- `src/reporting/dashboardDigest.js` — `INSTRUMENT_DESCRIPTIONS` map + `describeInstrument()`
- `lib/tradeNotificationEmail.js` — readiness bridge + name precedence
- `src/reporting/investorReportingData.js` — `normalizeFilledTrade` name precedence
- `scripts/monitor-fills.js` — forwards `order.name`
- `docs/operations/active-cron-jobs.{json,md}` — cron snapshot refreshed
- `runtime/basket-proposals/etf/basket-etf-20260603T1417-20k-deconcentration.json` (envelope)
- `portfolio/etf/portfolio.md` — 4 new approved instruments
- `portfolio/etf/deposits.md` — row 9 (20k, `pending_ibkr_xls` reference)
- `portfolio/etf/history.md` — backfilled `Net deposited CHF` column

## Tests added/extended

- `scripts/test-trade-notification-readiness-bridge.js` — 4 cases: ISIN↔conid match, reverse direction, unrelated-symbol fail-closed, canonical-name resolution

Total: safe lane went 241 → 242. `npm test` stayed at 23.

## Email delivery audit trail

| Time (UTC) | Event | Mailgun id |
|---|---|---|
| 11:26 | Pre-deploy dashboard digest | `<20260603112605.02020dd66f91d59d@mailgun.swift.ch>` |
| 14:29 | 4 live fills (XDEW/MWEQ/IS3H/DXS0) submitted to IBKR | n/a |
| 15:13 | Post-trade dashboard digest | `<20260603151329.b09fe5fc572a5923@mailgun.swift.ch>` |
| 15:24 | Dashboard digest with per-instrument descriptions | `<20260603152423.eb2397e5c3139bae@mailgun.swift.ch>` |
| 15:49 | First fill emails (correct symbols, wrong names) | 4 ids `…ccdb…/…792c…/…1903…/…c5c6…` |
| 16:06 | Resent fill emails with canonical names | `<20260603160631.20678e2e9d229a5b…>`, `<…813eb52c5d21f649…>`, `<…55e9ac888e610a62…>`, `<…c88b8aa50f29223b…>` |

## Pattern lessons

1. When bridging across IBKR-native (conid) and contract-native (ISIN) shapes, never use single-field strict-string equality. Always project through an `identityValues()` set with the `approvedInstruments` crosswalk.
2. When fallback chains include both authoritative sources (`approvedInstruments`) and derived local data (IBKR positions feed), put the authoritative source first. The IBKR positions feed's `name` field is just the contract's local symbol and will pollute downstream rendering if it wins.
3. The email delivery layer in `src/reporting/emailDelivery.js` dedups by hashed subject. To re-send: clear `src/runtime/email-locks/<hash>.json` AND the relevant entry in `runtime/fill-notifications-state.json#notifiedFills`.
4. Add new instruments to `portfolio.md` Approved Instruments BEFORE first execution — the policy gate enforces the Approved Instruments list even when the basket envelope already carries broker-resolved conids.

## Pending follow-ups (now in `CURRENT_PLAN.md` Phase F/G/H)

- F4 / G3: backfill `pending_ibkr_xls` reference once IBKR XLS arrives
- F5: passive soak — 3 market days of `monitor-fills` runs with no `deferred:` lines
- F6: retire deferred-email comment block in `lib/tradeExecutionNotifier.js` once F5 passes
- G2: wire `import-ibkr-deposits.js` into daily-sync cron after F4/G3 lands
- G4: document deposits-ledger lifecycle in `docs/operator-runbooks.md`
- H1: collect 1-2 weeks of post-basket behaviour data before deciding additive vs replacement targets
