# Trade Proposal — Initial Portfolio Deployment

**Date:** 2026-05-08 (to execute at market open)
**Portfolio:** etf
**Account:** U25624150
**Available cash:** CHF 5,000.00
**Execution mode:** require_confirmation (limit orders only)

## Market Data (close 2026-05-07)

| Instrument | ISIN | Symbol | Exchange | Price | Currency | CHF equiv |
|---|---|---|---|---:|---|---:|
| iShares Core S&P 500 | IE00B5BMR087 | CSPX | LSEETF | 793.00 | USD | 619.02 |
| UBS ETF SLI | CH0032912732 | SLICHA | EBS | 221.60 | CHF | 221.60 |
| UBS MSCI EMU A Acc | LU0950668870 | EMUAA | EBS | 40.10 | EUR | 36.71 |

**FX Rates:** USD/CHF 0.7806 | EUR/CHF 0.9154

## Proposed Trades

| # | Action | Symbol | Exchange | Qty | Limit Price | Currency | Est. CHF Cost | Alloc % |
|---|---|---|---|---:|---:|---|---:|---:|
| 1 | BUY | SLICHA | EBS | 4 | 222.50 | CHF | 890.00 | 17.8% |
| 2 | BUY | EMUAA | EBS | 27 | 40.30 | EUR | 995.44 | 19.9% |
| 3 | BUY | VUSA | EBS | 18 | 109.50 | CHF | 1,971.00 | 39.4% |

## Post-Trade Expected Allocation

| Instrument | Value CHF | Allocation | Target | Drift |
|---|---:|---:|---:|---:|
| VUSA | 1,971.00 | 39.4% | 40% | -0.6% |
| EMUAA | 995.44 | 19.9% | 20% | -0.1% |
| SLICHA | 890.00 | 17.8% | 20% | -2.2% |
| CASH | 1,252.82 | 25.1% | 20% | +5.1% |

**Total deployed:** CHF 3,856.44 (77.1%)
**Remaining cash:** CHF 1,252.82 (25.1%)

## Rationale

- **SLICHA first** — CHF-denominated, no FX risk, simplest execution
- **EMUAA second** — EUR/CHF FX is tight (2bp spread at IB)
- **CSPX third** — largest position, USD/CHF FX needed
- All trades above CHF 500 minimum trade size ✓
- Cash kept above CHF 1,000 (20% defensive sleeve) ✓
- Limit prices set ~0.5% above last close to allow fills at open without overpaying
- Drift from target is due to share price granularity (CSPX at CHF 619/share)

## Estimated Transaction Costs

| Item | Cost |
|---|---:|
| SLICHA commission | CHF 1.50 |
| EMUAA commission | CHF 1.50 |
| CSPX commission | CHF 1.50 |
| FX conversion (EUR + USD) | CHF 0.11 |
| **Total** | **CHF 4.61** |

Cost as % of deployed capital: **0.12%**

## Execution Plan

1. Place limit order: BUY 4 SLICHA @ 222.50 CHF on EBS
2. Place limit order: BUY 27 EMUAA @ 40.30 EUR on EBS
3. Place limit order: BUY 18 VUSA @ 109.50 CHF on EBS (Vanguard S&P 500, replaces CSPX — no LSE trading permissions)
4. Monitor fills (all should fill quickly at open given limit above close)
5. If any order doesn't fill within 30 min, review and adjust limit

## Approval Required

This proposal requires explicit operator approval before execution.
Markets open 2026-05-08 at 09:00 CET (07:00 UTC).
