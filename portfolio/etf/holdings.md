# Holdings: etf

## Last Sync
- Date/time: 2026-05-29 08:06:23
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 92962.38376
- Portfolio cash CHF: 0
- Portfolio cash basis: broker_reported
- Broker account cash CHF: 29544.41
- Broker account cash basis: SettledCash
- Invested value CHF: 63417.97376

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| 91639399 | SPMCHA | Swiss equities | 64 | 130 | CHF | 1 | 8320 | 0 | 0 | 0 |
| 507487999 | SEC0 | Global equities | 521 | 18.356 | EUR | 0.96 | 9180.93696 | 0 | 0 | 0 |
| 311572503 | LCUJ | Global equities | 145 | 22.086 | EUR | 0.96 | 3074.3712 | 0 | 0 | 0 |
| 150029461 | CHSPI | Swiss equities | 38 | 163.16 | CHF | 1 | 6200.08 | 0 | 0 | 0 |
| 243939970 | EMUAA | Global equities | 316 | 41.04 | EUR | 0.96 | 12449.8944 | 0 | 0 | 0 |
| 75776072 | SXR8 | Global equities | 36 | 700.02 | EUR | 0.96 | 24192.6912 | 0 | 0 | 0 |

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | 0 | 1 | 0 | broker_reported |
| Broker account | CHF | 29544.41 | 1 | 29544.41 | SettledCash |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
- Holdings using market snapshot pricing: 6
- Holdings using avg-cost fallback pricing: 0
- Warnings:
 - Instrument-level target mapping is not implemented yet.
 - All holdings use broker market snapshot pricing or CHF cash.
 - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.
 - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.
 - Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.
- Cash detail (CHF ledger tags): AvailableFunds=29544.41, BuyingPower=29544.41, NetLiquidation=90604.53, SettledCash=29544.41, TotalCashValue=29544.41
