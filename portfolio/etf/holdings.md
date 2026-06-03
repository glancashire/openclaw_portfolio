# Holdings: etf

## Last Sync
- Date/time: 2026-06-03 14:29:48
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 141621.37489255
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 1468.66
- Broker account cash basis: SettledCash
- Invested value CHF: 140152.71489255

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 136319312 | UKGBPB | Global equities | 180 | 42.68533335 (avg cost) | GBP | 1.092359 | 8392.98744952 | 0 | 0 | 0 |
| 747339250 | AIFS | Global equities | 520 | 10.126 | EUR | 0.911882 | 4801.53290864 | 0 | 0 | 0 |
| 53524044 | DXS0 | Swiss equities | 12 | 245.4 | EUR | 0.911882 | 2685.3101136 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 68 | 159.6 | CHF | 1 | 10852.8 | 0 | 0 | 0 |
| 91639399 | SPMCHA | Swiss equities | 101 | 128.98 | CHF | 1 | 13026.98 | 0 | 0 | 0 |
| 732138353 | MWEQ | Global equities | 903 | 5.735 | EUR | 0.911882 | 4722.36787281 | 0 | 0 | 0 |
| 83570158 | HMCD | Global equities | 1086 | 7.725 | USD | 0.835892 | 7012.5905502 | 0 | 0 | 0 |
| 352446357 | XAIX | Global equities | 23 | 218.3 | EUR | 0.911882 | 4578.4683338 | 0 | 0 | 0 |
| 78767919 | CEBL | Global equities | 47 | 272.65 | EUR | 0.911882 | 11685.3574831 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 575 | 19.518 | EUR | 0.911882 | 10233.9149037 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 453 | 22.363 | EUR | 0.911882 | 9237.7649762 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 447 | 40.88729305 (avg cost) | EUR | 0.911882 | 16666.12079278 | 0 | 0 | 0 |
| 163606923 | XDEW | Global equities | 82 | 100.16 | EUR | 0.911882 | 7489.39629184 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 39 | 702.96 | EUR | 0.911882 | 24999.64625808 | 0 | 0 | 0 |
| 134428813 | IS3H | Global equities | 54 | 76.51 | EUR | 0.911882 | 3767.47695828 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 1468.66 | 1 | 1468.66 | SettledCash |

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
- Cash detail (CHF ledger tags): AvailableFunds=1468.66, BuyingPower=1468.66, NetLiquidation=141621.36, SettledCash=1468.66, TotalCashValue=1468.66
