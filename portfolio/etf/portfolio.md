# Portfolio: ETF

## Status
- Status: draft
- Created: 2026-04-27
- Last reviewed: 2026-04-27
- Base currency: CHF
- Broker: interactive-brokers
- Broker account reference: LTME7
- Execution mode: require_confirmation
- Asset scope: ETF only

## Strategy Summary
ETF portfolio draft for Interactive Brokers, awaiting final onboarding details and approved instrument allocation targets.

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
| Switzerland | 50 | 40 | 60 |
| Eurozone | 12 | 9 | 15 |
| UK | 3 | 2 | 4 |
| USA | 20 | 15 | 25 |
| China | 8 | 6 | 12 |
| Japan | 4 | 2 | 6 |
| Asia | 3 | 2 | 4 |

## Industry / Sector Constraints
| Sector | Min % | Max % | Notes |
|---|---:|---:|---|
| Technology | 0 | 30 | Avoid excessive concentration |
| Financials | 0 | 25 | Avoid excessive concentration |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities | <target %> | <min %> | <max %> | SIX | CHF | https://www.justetf.com/ch/etf-profile.html?isin=CH0032912732 |
| CH0130595124 | UBS SPI Mid ETF (SPI ohne SMI) | Swiss equities | <target %> | <min %> | <max %> | SIX | CHF | https://www.justetf.com/ch/etf-profile.html?isin=CH0130595124#uebersicht |
| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | Global equities | <target %> | <min %> | <max %> | <exchange> | EUR | https://www.justetf.com/ch/etf-profile.html?isin=LU0950668870#basisinfos |
| LU0950670850 | UBS ETF (LU) MSCI UK UCITS ETF (GBP) A-acc | Global equities | <target %> | <min %> | <max %> | <exchange> | GBP | https://www.justetf.com/ch/etf-profile.html?isin=LU0950670850 |
| IE00B5BMR087 | iShares Core S&P 500 UCITS ET USD (Acc) | Global equities | <target %> | <min %> | <max %> | <exchange> | USD | https://www.justetf.com/ch/etf-profile.html?isin=IE00B5BMR087 |
| IE00B44T3H88 | HSBC MSCI China HMCH SE | Global equities | <target %> | <min %> | <max %> | <exchange> | USD | https://www.justetf.com/ch/etf-profile.html?isin=IE00B44T3H88 |
| IE00B5L8K969 | iShares MSCI EM Asia, CSEMAS | Global equities | <target %> | <min %> | <max %> | <exchange> | USD | https://www.justetf.com/ch/etf-profile.html?isin=IE00B5L8K969 |
| IE00B4L5YX21 | iShares Core MSCI Japan IMI UCITS ETF USD (Acc) | Global equities | <target %> | <min %> | <max %> | <exchange> | USD | https://www.justetf.com/ch/etf-profile.html?isin=IE00B4L5YX21 |
| US37950E2596 | Uts Glbl X MSCI AR Shs (21347688) | Global equities | <target %> | <min %> | <max %> | <exchange> | USD | https://www.justetf.com/ch/etf-profile.html?isin=US37950E2596 |
| <ticker / ISIN> | <bond or money-market ETF needed> | Bonds / cash-like | <target %> | <min %> | <max %> | <exchange> | CHF | Conservative placeholder to satisfy asset-class coverage until approved. |

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|


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
- Confirm broker account alias/reference.
- Confirm initial capital and expected portfolio size.
- Confirm investment horizon and maximum acceptable drawdown.
- Confirm any excluded or already-held instruments.
