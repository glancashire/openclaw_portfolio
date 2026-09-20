# Holdings: etf

## Last Sync
- Date/time: 2026-08-28 17:05:31
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 156186.65509584997
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 223.36
- Broker account cash basis: SettledCash
- Invested value CHF: 155963.29509585

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 136319312 | UKGBPB | Global equities | 180 | 44.605 | GBP | 1.12137 | 9003.367593 | 0 | 0 | 0 |
| 747339250 | AIFS | Global equities | 520 | 9.579 | EUR | 0.9361 | 4662.788988 | 0 | 0 | 0 |
| 53524044 | DXS0 | Swiss equities | 12 | 258.8 | EUR | 0.9361 | 2907.15216 | 0 | 0 | 0 |
| 227263991 | XDW0 | Global equities | 80 | 64.53 | EUR | 0.9361 | 4832.52264 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 68 | 172.04 | CHF | 1 | 11698.72 | 0 | 0 | 0 |
| 552352705 | INRE | Global equities | 57 | 22.585 | EUR | 0.9361 | 1205.0836545 | 0 | 0 | 0 |
| 91639399 | SPMCHA | Swiss equities | 101 | 129.45237625 (avg cost) | CHF | 1 | 13074.69000125 | 0 | 0 | 0 |
| 732138353 | MWEQ | Global equities | 903 | 6.05 | EUR | 0.9361 | 5114.054715 | 0 | 0 | 0 |
| 83570158 | HMCD | Global equities | 1086 | 7.6 | USD | 0.858092 | 7082.3481312 | 0 | 0 | 0 |
| 626090692 | NUCL | Global equities | 63 | 44.94 | CHF | 1 | 2831.22 | 0 | 0 | 0 |
| 352446357 | XAIX | Global equities | 23 | 207 | EUR | 0.9361 | 4456.7721 | 0 | 0 | 0 |
| 159310437 | R2SC | Global equities | 32 | 64.59 | GBP | 1.12137 | 2317.7372256 | 0 | 0 | 0 |
| 78767919 | CEBL | Global equities | 47 | 260.3 | EUR | 0.9361 | 11452.34101 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 575 | 16.742 | EUR | 0.9361 | 9011.507065 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 453 | 22.896 | EUR | 0.9361 | 9709.1243568 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 447 | 43.365 | EUR | 0.9361 | 18145.5074955 | 0 | 0 | 0 |
| 163606923 | XDEW | Global equities | 82 | 106.06 | EUR | 0.9361 | 8141.186812 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 39 | 717 | EUR | 0.9361 | 26176.1643 | 0 | 0 | 0 |
| 134428813 | EMUM | Global equities | 54 | 81.92 | EUR | 0.9361 | 4141.006848 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 223.36 | 1 | 223.36 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
- Holdings using market snapshot pricing: 18
- Holdings using avg-cost fallback pricing: 1
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=223.36, BuyingPower=223.36, NetLiquidation=156186.64, SettledCash=223.36, TotalCashValue=223.36
