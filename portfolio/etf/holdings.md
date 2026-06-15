# Holdings: etf

## Last Sync
- Date/time: 2026-06-15 11:44:11
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 152964.67780566003
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 209.64
- Broker account cash basis: SettledCash
- Invested value CHF: 152755.03780566002

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 136319312 | UKGBPB | Global equities | 180 | 43.055 | GBP | 1.096132 | 8494.9133868 | 0 | 0 | 0 |
| 747339250 | AIFS | Global equities | 520 | 10.036 | EUR | 0.915032 | 4775.29579904 | 0 | 0 | 0 |
| 53524044 | DXS0 | Swiss equities | 12 | 255.85 | EUR | 0.915032 | 2809.3312464 | 0 | 0 | 0 |
| 227263991 | XDW0 | Global equities | 80 | 58.81 | EUR | 0.915032 | 4305.0425536 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 68 | 165.78 | CHF | 1 | 11273.04 | 0 | 0 | 0 |
| 552352705 | INRE | Global equities | 57 | 27.08 | EUR | 0.915032 | 1412.40679392 | 0 | 0 | 0 |
| 91639399 | SPMCHA | Swiss equities | 101 | 129.45237625 (avg cost) | CHF | 1 | 13074.69000125 | 0 | 0 | 0 |
| 732138353 | MWEQ | Global equities | 903 | 5.813 | EUR | 0.915032 | 4803.13015745 | 0 | 0 | 0 |
| 83570158 | HMCD | Global equities | 1086 | 7.6 | USD | 0.838779 | 6922.9463544 | 0 | 0 | 0 |
| 626090692 | NUCL | Global equities | 63 | 47.5443651 (avg cost) | CHF | 1 | 2995.2950013 | 0 | 0 | 0 |
| 352446357 | XAIX | Global equities | 23 | 209.8 | EUR | 0.915032 | 4415.3954128 | 0 | 0 | 0 |
| 159310437 | R2SC | Global equities | 32 | 65.11 | GBP | 1.096132 | 2283.81294464 | 0 | 0 | 0 |
| 78767919 | CEBL | Global equities | 47 | 270.25 | EUR | 0.915032 | 11622.507706 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 575 | 19.834 | EUR | 0.915032 | 10435.5281956 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 453 | 22.471 | EUR | 0.915032 | 9314.44288462 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 447 | 42.4 | EUR | 0.915032 | 17342.4184896 | 0 | 0 | 0 |
| 163606923 | XDEW | Global equities | 82 | 102.22 | EUR | 0.915032 | 7669.83482528 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 39 | 697.9 | EUR | 0.915032 | 24905.4324792 | 0 | 0 | 0 |
| 134428813 | IS3H | Global equities | 54 | 78.92 | EUR | 0.915032 | 3899.57357376 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 209.64 | 1 | 209.64 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
- Holdings using market snapshot pricing: 17
- Holdings using avg-cost fallback pricing: 2
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=209.64, BuyingPower=209.64, NetLiquidation=152964.67, SettledCash=209.64, TotalCashValue=209.64
