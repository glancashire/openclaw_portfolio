# Portfolio: ETF

## Status
- Status: draft
- Created: 2026-04-27
- Last reviewed: 2026-04-27
- Base currency: CHF
- Broker: interactive-brokers
- Broker account reference: U25624150
- Execution mode: require_confirmation
- Asset scope: ETF only

## Strategy Summary
Simple CHF-first starter ETF portfolio for Interactive Brokers targeting broad equity exposure with a small Swiss tilt and a defensive CHF cash-like sleeve. Sized for approximately CHF 5000 and designed to stay easy to manage.

## Investor Profile
- Risk level: medium
- Investment horizon: 10
- Liquidity needs: low
- Maximum acceptable drawdown: 30%
- Income requirement: none
- ESG preference: none
- Currency preference: CHF-first

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 60 | 50 | 70 | Broad developed-market ETF |
| Swiss equities | 20 | 10 | 30 | CHF exposure |
| Bonds / cash-like | 20 | 10 | 30 | CHF bonds or money-market ETF |

## Geographic Targets
| Region | Target % | Min % | Max % |
|---|---:|---:|---:|
| Switzerland | 20 | 10 | 30 |
| Developed World ex-CH | 60 | 50 | 70 |
| Bonds / cash-like CHF | 20 | 10 | 30 |

## Industry / Sector Constraints
| Sector | Min % | Max % | Notes |
|---|---:|---:|---|
| Technology | 0 | 30 | Avoid excessive concentration |
| Financials | 0 | 25 | Avoid excessive concentration |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| IE00B5BMR087 | iShares Core S&P 500 UCITS ETF USD (Acc) | Global equities | 40 | 30 | 50 | LSE / IBKR-supported venue | USD | Core developed-market anchor; preferred iShares issuer; ibkr_symbol=CSPX; fx_to_chf=0.9 |
| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | Global equities | 20 | 10 | 30 | Xetra / IBKR-supported venue | EUR | Adds continental Europe exposure; preferred UBS issuer; ibkr_symbol=EMUAA; fx_to_chf=0.96 |
| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities | 20 | 10 | 30 | SIX | CHF | Swiss home-market sleeve; equal-weight tilt reduces single-name concentration; ibkr_symbol=UBSSLI; fx_to_chf=1 |
| CASH-CHF | CHF cash balance | Bonds / cash-like | 20 | 10 | 30 | IBKR cash balance | CHF | Keep defensive sleeve as cash for now to stay simple at CHF 5000 scale. |

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|
| none | none |

## Rebalancing Policy
- Check frequency: daily
- Rebalance frequency: monthly or when thresholds are breached
- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%
- Minimum trade size: CHF 500
- Avoid unnecessary trades: true
- Prefer using new cash before selling: true

## Market Entry Policy
- Initial deployment mode: staged
- Deployment period: 10
- Max daily deployment: 10%
- Avoid buying after extreme daily price moves: true
- Use limit orders where supported: true
- Require confirmation before first live trade: true

## Risk Limits
- Max single ETF allocation: 5%
- Max single issuer allocation: 10%
- Max equity allocation: 100%
- Max bond duration: 10
- Max cash drag after full deployment: 5%
- Stop trading if portfolio value drops by: 20% over 30 calendar days
- Stop trading if broker/API errors occur: true

## Broker Access
- Broker adapter: interactive-brokers
- Credentials source: environment variables or secret store only
- Never store API keys in Markdown: true
- Account matching rule: account id mapping
- Read-only mode available: true
- Dry-run mode available: true

## Automation Permissions
- Sync holdings automatically: yes
- Generate trade proposals automatically: yes
- Execute trades automatically: no by default
- Send reports automatically: yes
- Require user approval for new instruments: yes
- Require user approval for first purchase: yes
- Require user approval for sales: yes unless auto_trade_limited is enabled

## Notes / Open Questions
- ETF issuer preferences: prefer UBS and iShares; exclude Invesco.
- Already-held instruments note: none
- Defensive sleeve set to CHF cash for now; revisit a CHF money-market or short-duration bond ETF once portfolio size justifies it.
