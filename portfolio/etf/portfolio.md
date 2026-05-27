# Portfolio: ETF

## Status
- Status: active
- Created: 2026-04-27
- Last reviewed: 2026-05-02
- Base currency: CHF
- Broker: interactive-brokers
- Broker account reference: U25624150
- Execution mode: transmitted_live
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
| IE00B5BMR087 | iShares Core S&P 500 UCITS ETF USD (Acc) | Global equities | 40 | 30 | 50 | Xetra / SMART | EUR | Preferred operational replacement after UBSPX execution failures; physical replication; validated via native IBKR contract details and live quote path on SXR8; ibkr_symbol=SXR8; ibkr_conid=75776072; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | Global equities | 20 | 10 | 30 | Xetra / IBKR-supported venue | EUR | Adds continental Europe exposure; preferred UBS issuer; physical replication; ibkr_symbol=EMUAA; ibkr_conid=243939970; fx_to_chf=0.96 |
| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities | 12 | 8 | 16 | SIX / EBS | CHF | Swiss large-cap sleeve; equal-weight tilt reduces single-name concentration; live broker contract identity previously surfaced as CHSPI during native placement/reconciliation, so conid truth must win over cosmetic ticker alias drift; physical replication; ibkr_symbol=UBSSLI; ibkr_local_symbol=CHSPI; ibkr_conid=150029461; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| CH0130595124 | UBS SPI Mid ETF (SPI ohne SMI) | Swiss equities | 8 | 4 | 12 | SIX / EBS | CHF | Swiss mid-cap complement; improves breadth of the Swiss sleeve; physical replication; ibkr_symbol=SPMCHA; ibkr_conid=91639399; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| LU0950670850 | UBS MSCI United Kingdom UCITS ETF GBP acc | Global equities | 0 | 0 | 0 | EBS / IBKR-supported venue | GBP | Future candidate for UK sleeve; physical replication; resolved via W6 native contract intelligence (2026-05-27); ibkr_symbol=UKGBPB; ibkr_conid=136319312; ibkr_primary_exchange=EBS; fx_to_chf=1.15 |
| IE00B44T3H88 | HSBC MSCI China UCITS ETF USD | Global equities | 0 | 0 | 0 | LSEETF / IBKR-supported venue | USD | Future candidate for China sleeve; physical replication; resolved via W6 native contract intelligence (2026-05-27); ibkr_symbol=HMCD; ibkr_conid=83570158; ibkr_primary_exchange=LSEETF; fx_to_chf=0.88 |
| IE00B5L8K969 | iShares MSCI EM Asia UCITS ETF (Acc) | Global equities | 0 | 0 | 0 | IBIS2 / IBKR-supported venue | EUR | Future candidate for Asia sleeve; physical replication; resolved via W6 native contract intelligence (2026-05-27) — IBKR contract is EUR-listed (Xetra/IBIS2), not USD; verify currency expectation before activation; ibkr_symbol=CEBL; ibkr_conid=78767919; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| LU1781541252 | Amundi Core MSCI Japan UCITS ETF Acc | Global equities | 0 | 0 | 0 | IBIS2 / Xetra | EUR | Future candidate for Japan sleeve; physical full replication; accumulating; TER 0.12%; AUM €5.4B; replaced IE00B4L5YX21 (unresolvable on IBKR) per operator decision 2026-05-27; ibkr_symbol=LCUJ; ibkr_conid=311572503; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| CASH-CHF | CHF cash balance | Bonds / cash-like | 20 | 10 | 30 | IBKR cash balance | CHF | Keep defensive sleeve as cash for now to stay simple at CHF scale. |

## Candidate Instruments
| Ticker / ISIN | Region | Theme | Name | TER | Replication | Currency | IBKR status | Notes |
|---|---|---|---|---:|---|---|---|---|
| LU0950670850 | UK | MSCI UK | UBS MSCI United Kingdom UCITS ETF GBP acc | 0.20% | physical | GBP | needs IBKR verification | Future UK sleeve candidate retained for later use. |
| IE00B44T3H88 | China | MSCI China | HSBC MSCI China UCITS ETF USD | 0.28% | physical | USD | needs IBKR verification | Broad China exposure; use only after IBKR contract truth is confirmed. |
| IE00B5L8K969 | Asia | MSCI EM Asia | iShares MSCI EM Asia UCITS ETF (Acc) | 0.20% | physical | USD | needs IBKR verification | Broad emerging Asia exposure; verify conid/symbol before use. |
| LU1781541252 | Japan | MSCI Japan | Amundi Core MSCI Japan UCITS ETF Acc | 0.12% | physical (full) | EUR | verified (conid 311572503, IBIS2) | Replaced IE00B4L5YX21 (IBKR-unresolvable). Accumulating, €5.4B AUM. |
| IE00B53SZB19 | NASDAQ | Nasdaq 100 | iShares Nasdaq 100 UCITS ETF (Acc) | 0.30% | physical | USD | research-only | Best low-TER physical UCITS Nasdaq 100 candidate from the sources checked. |
| XS2940466316 | Crypto | Bitcoin ETP | iShares Bitcoin ETP | 0.15% temporary / 0.25% standard | physically backed ETP | USD | research-only | Suitable Europe/Switzerland-friendly Bitcoin alternative to US IBIT for future consideration; not UCITS and not in the ETF-only MVP lane. |

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|
| IE000XZSV718 | Replaced by UBS Core S&P 500 UCITS ETF USD acc after IBKR execution-path issues on the prior line. |
| IE00B4L5YX21 | Replaced by LU1781541252 (Amundi Core MSCI Japan) — the iShares Japan IMI ISIN was unresolvable via IBKR native API (W6 2026-05-27). |
| US46438F1012 | BlackRock iShares Bitcoin Trust is US-specific trust structure; keep excluded from the ETF-only MVP portfolio and prefer the European iShares Bitcoin ETP candidate if crypto exposure is ever approved. |

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
- Max single ETF allocation: 50%
- Max single issuer allocation: 60%
- Max equity allocation: 80%
- Max bond duration: n/a
- Max cash drag after full deployment: 25%
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
- Replacement validated through native IBKR contract details for the UBS Core S&P 500 alternative; use that line for future S&P 500 sleeve proposals.
- Future instrument consideration list retained: CH0032912732, CH0130595124, LU0950668870, LU0950670850, IE00B5BMR087, IE00B44T3H88, IE00B5L8K969, LU1781541252, US37950E2596.
- Already-held instruments note: none
- Defensive sleeve is intentionally held as CHF cash for this starter-scale MVP portfolio; revisit a CHF money-market or short-duration bond ETF later if portfolio size and trading costs justify it.
- 2026-05-22 rebalance decision: treat the settled IBKR broker cash balance (CHF 20,841.44 at last holdings sync) as the active defensive sleeve allocation for now, rather than forcing additional buys while the ETF sleeve cash bucket remains zero in portfolio-local accounting.
