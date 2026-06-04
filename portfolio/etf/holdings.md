# Holdings: etf

## Last Sync
- Date/time: 2026-06-04 08:06:11
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 141164.34873894998
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 1468.65
- Broker account cash basis: SettledCash
- Invested value CHF: 139695.69873894998

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 136319312 | UKGBPB | Global equities | 180 | 42.23 | GBP | 1.097769 | 8344.5812766 | 0 | 0 | 0 |
| 747339250 | AIFS | Global equities | 520 | 9.989 | EUR | 0.916398 | 4760.02780344 | 0 | 0 | 0 |
| 53524044 | DXS0 | Swiss equities | 12 | 246.2 | EUR | 0.916398 | 2707.4062512 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 68 | 160.32 | CHF | 1 | 10901.76 | 0 | 0 | 0 |
| 91639399 | SPMCHA | Swiss equities | 101 | 128.96 | CHF | 1 | 13024.96 | 0 | 0 | 0 |
| 732138353 | MWEQ | Global equities | 903 | 5.702 | EUR | 0.916398 | 4718.44716059 | 0 | 0 | 0 |
| 83570158 | HMCD | Global equities | 1086 | 7.68 | USD | 0.840032 | 7006.27009536 | 0 | 0 | 0 |
| 352446357 | XAIX | Global equities | 23 | 214.35 | EUR | 0.916398 | 4517.8879599 | 0 | 0 | 0 |
| 78767919 | CEBL | Global equities | 47 | 268 | EUR | 0.916398 | 11542.949208 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 575 | 19.076 | EUR | 0.916398 | 10051.6947426 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 453 | 22.267 | EUR | 0.916398 | 9243.6617225 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 447 | 40.88729305 (avg cost) | EUR | 0.916398 | 16748.65800867 | 0 | 0 | 0 |
| 163606923 | XDEW | Global equities | 82 | 100.22 | EUR | 0.916398 | 7530.99541992 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 39 | 693.97532565 (avg cost) | EUR | 0.916398 | 24802.34641853 | 0 | 0 | 0 |
| 134428813 | IS3H | Global equities | 54 | 76.67 | EUR | 0.916398 | 3794.05267164 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 1468.65 | 1 | 1468.65 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
- Holdings using market snapshot pricing: 13
- Holdings using avg-cost fallback pricing: 2
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=1468.65, BuyingPower=1468.65, NetLiquidation=141164.35, SettledCash=1468.65, TotalCashValue=1468.65
