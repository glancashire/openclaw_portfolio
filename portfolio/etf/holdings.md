# Holdings: etf

## Last Sync
- Date/time: 2026-05-29 14:21:42
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 90491.2276831
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 4701.68
- Broker account cash basis: SettledCash
- Invested value CHF: 85789.54768310001

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 91639399 | SPMCHA | Swiss equities | 64 | 130.26 | CHF | 1 | 8336.64 | 0 | 0 | 0 |
| 136319312 | UKGBPB | Global equities | 131 | 42.785 | GBP | 1.082321 | 6066.23062204 | 0 | 0 | 0 |
| 83570158 | HMCD | Global equities | 701 | 7.555 | USD | 0.828211 | 4386.25100761 | 0 | 0 | 0 |
| 78767919 | CEBL | Global equities | 29 | 266.25 | EUR | 0.903503 | 6976.17253875 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 521 | 18.478 | EUR | 0.903503 | 8698.05771411 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 262 | 21.974 | EUR | 0.903503 | 5201.63662956 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 68 | 163.6 | CHF | 1 | 11124.8 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 329 | 41.085 | EUR | 0.903503 | 12212.61842839 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 36 | 700.58 | EUR | 0.903503 | 22787.14074264 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 4701.68 | 1 | 4701.68 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
- Holdings using market snapshot pricing: 9
- Holdings using avg-cost fallback pricing: 0
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=4701.68, BuyingPower=4701.68, NetLiquidation=90491.2, SettledCash=4701.68, TotalCashValue=4701.68
