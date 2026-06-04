# Holdings: etf

## Last Sync
- Date/time: 2026-06-04 17:05:16
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 141037.12626237
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 1468.65
- Broker account cash basis: SettledCash
- Invested value CHF: 139568.47626237

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 136319312 | UKGBPB | Global equities | 180 | 42.389999 | GBP | 1.091587 | 8329.02693091 | 0 | 0 | 0 |
| 747339250 | AIFS | Global equities | 520 | 9.97 | EUR | 0.911238 | 4724.2222872 | 0 | 0 | 0 |
| 53524044 | DXS0 | Swiss equities | 12 | 247.2 | EUR | 0.911238 | 2703.0964032 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 68 | 161.06 | CHF | 1 | 10952.08 | 0 | 0 | 0 |
| 91639399 | SPMCHA | Swiss equities | 101 | 129.24 | CHF | 1 | 13053.24 | 0 | 0 | 0 |
| 732138353 | MWEQ | Global equities | 903 | 5.745 | EUR | 0.911238 | 4727.26126593 | 0 | 0 | 0 |
| 83570158 | HMCD | Global equities | 1086 | 7.68 | USD | 0.835302 | 6966.81962496 | 0 | 0 | 0 |
| 352446357 | XAIX | Global equities | 23 | 214.8 | EUR | 0.911238 | 4501.8802152 | 0 | 0 | 0 |
| 78767919 | CEBL | Global equities | 47 | 269 | EUR | 0.911238 | 11520.782034 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 575 | 19.078 | EUR | 0.911238 | 9996.1441743 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 453 | 22.289 | EUR | 0.911238 | 9200.69445325 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 447 | 40.88729305 (avg cost) | EUR | 0.911238 | 16654.3506495 | 0 | 0 | 0 |
| 163606923 | XDEW | Global equities | 82 | 100.5 | EUR | 0.911238 | 7509.512358 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 39 | 702.22 | EUR | 0.911238 | 24955.69238604 | 0 | 0 | 0 |
| 134428813 | IS3H | Global equities | 54 | 76.69 | EUR | 0.911238 | 3773.67347988 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 1468.65 | 1 | 1468.65 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
- Holdings using market snapshot pricing: 14
- Holdings using avg-cost fallback pricing: 1
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=1468.65, BuyingPower=1468.65, NetLiquidation=141037.14, SettledCash=1468.65, TotalCashValue=1468.65
