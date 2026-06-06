# Holdings: etf

## Last Sync
- Date/time: 2026-06-05 15:00:27
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 149681.70820826
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 2433.12
- Broker account cash basis: SettledCash
- Invested value CHF: 147248.58820826001

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 136319312 | UKGBPB | Unknown | 180 | 42.68533335 (avg cost) | GBP | 0.918183 | 7054.73053763 | 0 | 0 | 0 |
| 747339250 | AIFS | Unknown | 520 | 9.597 | EUR | 0.918183 | 4582.13717052 | 0 | 0 | 0 |
| 53524044 | DXS0 | Unknown | 12 | 247.75 | EUR | 0.918183 | 2729.758059 | 0 | 0 | 0 |
| 227263991 | XDW0 | Unknown | 80 | 61.85 | EUR | 0.918183 | 4543.169484 | 0 | 0 | 0 |
| 150029461 | CHSPI | Unknown | 68 | 161.2 | CHF | 1 | 10961.6 | 0 | 0 | 0 |
| 552352705 | INRE | Unknown | 57 | 28.09 | EUR | 0.918183 | 1470.13034679 | 0 | 0 | 0 |
| 91639399 | SPMCHA | Unknown | 101 | 129.45237625 (avg cost) | CHF | 1 | 13074.69000125 | 0 | 0 | 0 |
| 732138353 | MWEQ | Unknown | 903 | 5.74 | EUR | 0.918183 | 4759.14448926 | 0 | 0 | 0 |
| 83570158 | HMCD | Unknown | 1086 | 7.57 | USD | 0.918183 | 7548.40080666 | 0 | 0 | 0 |
| 626090692 | NUCL | Unknown | 63 | 45.9 | CHF | 1 | 2891.7 | 0 | 0 | 0 |
| 352446357 | XAIX | Unknown | 23 | 206.5 | EUR | 0.918183 | 4360.9101585 | 0 | 0 | 0 |
| 78767919 | CEBL | Unknown | 47 | 258.8 | EUR | 0.918183 | 11168.4107388 | 0 | 0 | 0 |
| 507487999 | SEC0 | Unknown | 575 | 18.092 | EUR | 0.918183 | 9551.7659307 | 0 | 0 | 0 |
| 311572503 | LCUJ | Unknown | 453 | 22.149 | EUR | 0.918183 | 9212.58637595 | 0 | 0 | 0 |
| 243939970 | EMUAA | Unknown | 447 | 41.16 | EUR | 0.918183 | 16893.20828916 | 0 | 0 | 0 |
| 163606923 | XDEW | Unknown | 82 | 100.78 | EUR | 0.918183 | 7587.82758468 | 0 | 0 | 0 |
| 75776072 | SXR8 | Unknown | 39 | 699.28 | EUR | 0.918183 | 25040.61332136 | 0 | 0 | 0 |
| 134428813 | IS3H | Unknown | 54 | 77 | EUR | 0.918183 | 3817.804914 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 2433.12 | 1 | 2433.12 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: no
- Unmatched holdings: UKGBPB, AINF, DXS0, XDW0, CHSPI, INRE, SPMCHA, MWEQ, HMCD, NUCL, XAIX, CEBL, SEC0, LCUJ, EMUAA, XDEW, SXR8, IS3H
- Pricing source: broker_api
- Holdings using market snapshot pricing: 16
- Holdings using avg-cost fallback pricing: 2
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=2433.12, BuyingPower=2433.12, NetLiquidation=149681.74, SettledCash=2433.12, TotalCashValue=2433.12
