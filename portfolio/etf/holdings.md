# Holdings: etf

## Last Sync
- Date/time: 2026-05-29 12:44:09
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 94598.36653
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 4701.68
- Broker account cash basis: SettledCash
- Invested value CHF: 89896.68653

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 91639399 | SPMCHA | Swiss equities | 64 | 130 | CHF | 1 | 8320 | 0 | 0 | 0 |
| 136319312 | UKGBPB | Global equities | 131 | 42.785 | GBP | 1.15 | 6445.56025 | 0 | 0 | 0 |
| 83570158 | HMCD | Global equities | 701 | 7.5575 | USD | 0.88 | 4662.0706 | 0 | 0 | 0 |
| 78767919 | CEBL | Global equities | 29 | 265.65 | EUR | 0.96 | 7395.696 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 521 | 18.388 | EUR | 0.96 | 9196.94208 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 262 | 22.06 | EUR | 0.96 | 5548.5312 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 68 | 163.54 | CHF | 1 | 11120.72 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 329 | 41.265 | EUR | 0.96 | 13033.1376 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 36 | 699.48 | EUR | 0.96 | 24174.0288 | 0 | 0 | 0 |

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
- Cash detail (CHF ledger tags): AvailableFunds=4701.68, BuyingPower=4701.68, NetLiquidation=90448.32, SettledCash=4701.68, TotalCashValue=4701.68
