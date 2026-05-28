# Holdings: etf

## Last Sync
- Date/time: 2026-05-28 08:10:19
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 51649.979199999994
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 7153.88
- Broker account cash basis: SettledCash
- Invested value CHF: 44496.0992

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 91639399 | SPMCHA | Swiss equities | 64 | 129.2 | CHF | 1 | 8268.8 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 38 | 162 | CHF | 1 | 6156 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 254 | 41.105 | EUR | 0.96 | 10023.0432 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 30 | 696.12 | EUR | 0.96 | 20048.256 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 7153.88 | 1 | 7153.88 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
- Holdings using market snapshot pricing: 4
- Holdings using avg-cost fallback pricing: 0
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=7153.88, BuyingPower=7153.88, NetLiquidation=50219.99, SettledCash=7153.88, TotalCashValue=7153.88
