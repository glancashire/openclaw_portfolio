# Phase A + Phase C, archived 2026-06-03 (afternoon batch)

These plans were written and executed within the same autonomous session
between 11:00 and 12:30 UTC on 2026-06-03. All four are complete.

## Contents

| Plan | Status | Outcome |
|---|---|---|
| `phase-a1-history-net-deposited-column.md` | ✅ DONE | New `Net deposited CHF` column in `history.md`; `lib/depositsLedger.netDepositedAsOf`; backfill helper; ETF history fully migrated. |
| `phase-a2-ibkr-deposit-import.md` | ✅ DONE | `lib/ibkrDepositXls.js` (Python xlrd shim) + `scripts/import-ibkr-deposits.js` CLI with dedup + footer refresh. |
| `phase-a3-withdrawal-display.md` | ✅ DONE | Hero card (HTML + text) and dashboardDigest.js append "Deposits X · Withdrawals Y" when ledger has any withdrawals. |
| `phase-c-counter-freshness.md` | ✅ DONE | `send-dashboard-digest.js` auto-refreshes `runtime/overview/usage-counters.json` via in-process `buildSnapshot`+`writeSnapshot`. Best-effort. |

## Tests added

- `scripts/test-history-net-deposited-column.js` (5 sub-cases)
- `scripts/test-import-ibkr-deposits.js` (4 sub-cases, parser stubbed)
- `scripts/test-deposits-withdrawal-display.js` (2 sub-cases)
- `scripts/test-send-digest-counter-refresh.js` (5 wiring assertions + round-trip)

Total: safe lane went from 238 → 241; npm test stayed at 23/0.
