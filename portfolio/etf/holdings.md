# Holdings: etf

## Last Sync
- Date/time: 2026-06-05 08:56:46
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 149881.98592747
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 2433.12
- Broker account cash basis: SettledCash
- Invested value CHF: 147448.86592747

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 136319312 | UKGBPB | Global equities | 180 | 42.305 | GBP | 1.092922 | 8322.4917378 | 0 | 0 | 0 |
| 747339250 | AIFS | Global equities | 520 | 9.722 | EUR | 0.912352 | 4612.34079488 | 0 | 0 | 0 |
| 53524044 | DXS0 | Swiss equities | 12 | 247.1 | EUR | 0.912352 | 2705.3061504 | 0 | 0 | 0 |
| 227263991 | XDW0 | Global equities | 80 | 61.7 | EUR | 0.912352 | 4503.369472 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 68 | 160.9 | CHF | 1 | 10941.2 | 0 | 0 | 0 |
| 552352705 | INRE | Global equities | 57 | 28.735 | EUR | 0.912352 | 1494.33677904 | 0 | 0 | 0 |
| 91639399 | SPMCHA | Swiss equities | 101 | 129.45237625 (avg cost) | CHF | 1 | 13074.69000125 | 0 | 0 | 0 |
| 732138353 | MWEQ | Global equities | 903 | 5.735 | EUR | 0.912352 | 4724.80186416 | 0 | 0 | 0 |
| 83570158 | HMCD | Global equities | 1086 | 7.6025 | USD | 0.836323 | 6904.94612975 | 0 | 0 | 0 |
| 626090692 | NUCL | Global equities | 63 | 47.32 | CHF | 1 | 2981.16 | 0 | 0 | 0 |
| 352446357 | XAIX | Global equities | 23 | 209.35 | EUR | 0.912352 | 4393.0204976 | 0 | 0 | 0 |
| 78767919 | CEBL | Global equities | 47 | 260.6 | EUR | 0.912352 | 11174.6697664 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 575 | 18.356 | EUR | 0.912352 | 9629.6016544 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 453 | 22.191 | EUR | 0.912352 | 9171.4394641 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 447 | 40.88729305 (avg cost) | EUR | 0.912352 | 16674.71080417 | 0 | 0 | 0 |
| 163606923 | XDEW | Global equities | 82 | 100.3 | EUR | 0.912352 | 7503.7302592 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 39 | 698.14 | EUR | 0.912352 | 24841.02758592 | 0 | 0 | 0 |
| 134428813 | IS3H | Global equities | 54 | 77.05 | EUR | 0.912352 | 3796.0229664 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 2433.12 | 1 | 2433.12 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
- Holdings using market snapshot pricing: 16
- Holdings using avg-cost fallback pricing: 2
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=2433.12, BuyingPower=2433.12, NetLiquidation=149882.02, SettledCash=2433.12, TotalCashValue=2433.12
