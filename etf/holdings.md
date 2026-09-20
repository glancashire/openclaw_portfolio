# Holdings: etf

## Last Sync
- Date/time: 2026-08-28 15:00:17
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 156844.77464999998
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 223.36
- Broker account cash basis: SettledCash
- Invested value CHF: 156621.41465

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 136319312 | UKGBPB | Unknown | 180 | 44.57 | GBP | 0.9423 | 7559.69598 | 0 | 0 | 0 |
| 747339250 | AIFS | Unknown | 520 | 9.6 | EUR | 0.9423 | 4703.9616 | 0 | 0 | 0 |
| 53524044 | DXS0 | Unknown | 12 | 259 | EUR | 0.9423 | 2928.6684 | 0 | 0 | 0 |
| 227263991 | XDW0 | Unknown | 80 | 64.39 | EUR | 0.9423 | 4853.97576 | 0 | 0 | 0 |
| 150029461 | CHSPI | Unknown | 68 | 172.12 | CHF | 1 | 11704.16 | 0 | 0 | 0 |
| 552352705 | INRE | Unknown | 57 | 22.585 | EUR | 0.9423 | 1213.0651935 | 0 | 0 | 0 |
| 91639399 | SPMCHA | Unknown | 101 | 135.6 | CHF | 1 | 13695.6 | 0 | 0 | 0 |
| 732138353 | MWEQ | Unknown | 903 | 6.052 | EUR | 0.9423 | 5149.6280388 | 0 | 0 | 0 |
| 83570158 | HMCD | Unknown | 1086 | 7.6 | USD | 0.9423 | 7777.36728 | 0 | 0 | 0 |
| 626090692 | NUCL | Unknown | 63 | 45.04 | CHF | 1 | 2837.52 | 0 | 0 | 0 |
| 352446357 | XAIX | Unknown | 23 | 208.25 | EUR | 0.9423 | 4513.381425 | 0 | 0 | 0 |
| 159310437 | R2SC | Unknown | 32 | 64.9 | GBP | 0.9423 | 1956.96864 | 0 | 0 | 0 |
| 78767919 | CEBL | Unknown | 47 | 261.1 | EUR | 0.9423 | 11563.62291 | 0 | 0 | 0 |
| 507487999 | SEC0 | Unknown | 575 | 16.93 | EUR | 0.9423 | 9173.054925 | 0 | 0 | 0 |
| 311572503 | LCUJ | Unknown | 453 | 23.103 | EUR | 0.9423 | 9861.7904757 | 0 | 0 | 0 |
| 243939970 | EMUAA | Unknown | 447 | 43.42 | EUR | 0.9423 | 18288.855702 | 0 | 0 | 0 |
| 163606923 | XDEW | Unknown | 82 | 106.1 | EUR | 0.9423 | 8198.19846 | 0 | 0 | 0 |
| 75776072 | SXR8 | Unknown | 39 | 720.4 | EUR | 0.9423 | 26474.48388 | 0 | 0 | 0 |
| 134428813 | EMUM | Unknown | 54 | 81.9 | EUR | 0.9423 | 4167.41598 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 223.36 | 1 | 223.36 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: no
- Unmatched holdings: UKGBPB, AINF, DXS0, XDW0, CHSPI, INRE, SPMCHA, MWEQ, HMCD, NUCL, XAIX, R2SC, CEBL, SEC0, LCUJ, EMUAA, XDEW, SXR8, IS3H
- Pricing source: broker_api
- Holdings using market snapshot pricing: 19
- Holdings using avg-cost fallback pricing: 0
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=223.36, BuyingPower=223.36, NetLiquidation=156844.83, SettledCash=223.36, TotalCashValue=223.36
