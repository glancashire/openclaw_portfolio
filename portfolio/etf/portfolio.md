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
- Total capital deposited CHF: 150000
- Capital deposit history: see portfolio/etf/deposits.md (canonical ledger). Summary: 2026-04-27 initial 5000; 2026-05-20/21/22 top-ups 5000+20000+20000; 2026-05-28/29 top-ups 20000+20000; 2026-06-01/02/03 top-ups 10000+20000+20000; 2026-06-05 top-up 10000.

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
| Global equities | 65 | 60 | 70 | Strategic range reset after adding Japan and SEC0; anchored near current live holdings without freezing exact drift at zero. |
| Swiss equities | 20 | 15 | 25 | Keep the Swiss home-bias sleeve roughly where it sits today. |
| Bonds / cash-like | 15 | 10 | 20 | Cash sleeve stays meaningful, but may be redeployed gradually. |

## Geographic Targets
| Region | Target % | Min % | Max % |
|---|---:|---:|---:|
| Switzerland | 20 | 15 | 25 |
| Developed World ex-CH | 65 | 60 | 70 |
| Bonds / cash-like CHF | 15 | 10 | 20 |

## Industry / Sector Constraints
| Sector | Min % | Max % | Notes |
|---|---:|---:|---|
| Technology | 0 | 30 | Avoid excessive concentration |
| Financials | 0 | 25 | Avoid excessive concentration |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| IE00B5BMR087 | iShares Core S&P 500 UCITS ETF USD (Acc) | Global equities | 25 | 20 | 35 | Xetra / SMART | EUR | Preferred operational replacement after UBSPX execution failures; physical replication; validated via native IBKR contract details and live quote path on SXR8; ibkr_symbol=SXR8; ibkr_conid=75776072; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | Global equities | 14 | 10 | 20 | Xetra / IBKR-supported venue | EUR | Continental Europe exposure; preferred UBS issuer; physical replication; ibkr_symbol=EMUAA; ibkr_conid=243939970; ibkr_primary_exchange=IBIS2; external_quote_symbol=EMUAA.SW; fx_to_chf=0.96 |
| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities | 9 | 6 | 12 | SIX / EBS | CHF | Swiss large-cap sleeve; equal-weight tilt reduces single-name concentration; live broker contract identity previously surfaced as CHSPI during native placement/reconciliation, so conid truth must win over cosmetic ticker alias drift; physical replication; ibkr_symbol=UBSSLI; ibkr_local_symbol=CHSPI; ibkr_conid=150029461; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| CH0130595124 | UBS SPI Mid ETF (SPI ohne SMI) | Swiss equities | 11 | 8 | 14 | SIX / EBS | CHF | Swiss mid-cap complement; improves breadth of the Swiss sleeve; physical replication; ibkr_symbol=SPMCHA; ibkr_conid=91639399; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| LU0950670850 | UBS MSCI United Kingdom UCITS ETF GBP acc | Global equities | 7 | 4 | 10 | EBS / IBKR-supported venue | GBP | UK large-cap sleeve; physical replication; resolved via W6 native contract intelligence (2026-05-27); ibkr_symbol=UKGBPB; ibkr_conid=136319312; ibkr_primary_exchange=EBS; fx_to_chf=1.15 |
| IE00B44T3H88 | HSBC MSCI China UCITS ETF USD | Global equities | 5 | 2 | 8 | LSEETF / IBKR-supported venue | USD | China sleeve; physical replication; resolved via W6 native contract intelligence (2026-05-27); ibkr_symbol=HMCD; ibkr_conid=83570158; ibkr_primary_exchange=LSEETF; fx_to_chf=0.88 |
| IE00B5L8K969 | iShares MSCI EM Asia UCITS ETF (Acc) | Global equities | 8 | 5 | 12 | IBIS2 / IBKR-supported venue | EUR | Broad EM Asia sleeve (India, Korea, Taiwan, ASEAN); physical replication; ibkr_symbol=CEBL; ibkr_conid=78767919; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| LU1781541252 | Amundi Core MSCI Japan UCITS ETF Acc | Global equities | 6 | 3 | 9 | IBIS2 / Xetra | EUR | Future candidate for Japan sleeve; physical full replication; accumulating; TER 0.12%; AUM €5.4B; replaced IE00B4L5YX21 (unresolvable on IBKR) per operator decision 2026-05-27; ibkr_symbol=LCUJ; ibkr_conid=311572503; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| IE000I8KRLL9 | iShares MSCI Global Semiconductors UCITS ETF USD (Acc) | Global equities | 10 | 6 | 14 | IBIS2 / Xetra | EUR | Semiconductor/AI infrastructure sleeve; low-TER broad semiconductor exposure with NVIDIA, TSMC, ASML; physical replication; TER 0.35%; AUM ~€4.2B; ibkr_symbol=SEC0; ibkr_conid=507487999; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| IE000X59ZHE2 | iShares AI Infrastructure UCITS ETF USD (Acc) | Global equities | 5 | 0 | 8 | IBIS2 / Xetra | EUR | Dedicated AI infrastructure sleeve complementing SEC0 with broader AI compute/network/data-center exposure; physical full replication; TER 0.35%; launched 2024; validated via native IBKR contract details and live quote path on AINF/AIFS; ibkr_symbol=AINF; ibkr_local_symbol=AIFS; ibkr_conid=747339250; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| IE00BGV5VN51 | Xtrackers Artificial Intelligence & Big Data UCITS ETF 1C | Global equities | 5 | 0 | 8 | IBIS2 / Xetra | EUR | Broad AI and big-data sleeve as the currently IBKR-resolvable alternative to the desired robotics sleeve; physical full replication; TER 0.35%; large AUM; validated via native IBKR contract details and live quote path on XAIX; ibkr_symbol=XAIX; ibkr_conid=352446357; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| IE00BLNMYC90 | Xtrackers S&P 500 Equal Weight UCITS ETF 1C | Global equities | 6 | 0 | 10 | IBIS2 / Xetra | EUR | Mag-7 deconcentration sleeve via equal-weight S&P 500; physical full replication; accumulating; TER 0.15%; AUM €9bn; validated via native IBKR contract details (2026-06-03) and live quote path on XDEW; ibkr_symbol=XDEW; ibkr_conid=163606923; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| IE000OEF25S1 | Invesco MSCI World Equal Weight UCITS ETF Acc | Global equities | 4 | 0 | 8 | IBIS2 / Xetra | EUR | Global equal-weight sleeve; dilutes Mag-7 across ~1,400 names; physical replication; accumulating; TER 0.20%; AUM €1.3bn; launched Sep 2024; validated via native IBKR contract details (2026-06-03) and live quote path on MWEQ; ibkr_symbol=MWEQ; ibkr_conid=732138353; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| IE00BCLWRD08 | iShares MSCI EMU Mid Cap UCITS ETF EUR (Acc) | Global equities | 3 | 0 | 6 | IBIS2 / Xetra | EUR | Eurozone mid-cap sleeve to dial back EMU mega-cap (ASML/SAP/LVMH) concentration; physical replication (sampling); accumulating; TER 0.25%; substituted for EUMD (IE00BYXYX745) which IBKR did not resolve on 2026-06-03; validated via native IBKR contract details (2026-06-03) and live quote path on IS3H; ibkr_symbol=IS3H; ibkr_conid=134428813; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| LU0322248146 | Xtrackers SLI UCITS ETF 1D | Swiss equities | 2 | 0 | 5 | IBIS2 / Xetra | EUR | Swiss capped-large-cap sleeve; SLI methodology caps top 4 holdings at 9% each (Nestle/Roche/Novartis/UBS) so combined is bounded vs ~50% in SMI; physical full replication; **distributing** (no accumulating SLI class exists in UCITS today); TER 0.25%; validated via native IBKR contract details (2026-06-03) and live quote path on DXS0; ibkr_symbol=DXS0; ibkr_conid=53524044; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| IE00BM67HM91 | Xtrackers MSCI World Energy UCITS ETF 1C | Global equities | 3 | 0 | 5 | IBIS2 / Xetra | EUR | Energy production sleeve; physical full replication; TER 0.25%; AUM €1.7bn; ibkr_symbol=XDW0; ibkr_conid=227263991; ibkr_primary_exchange=IBIS2; fx_to_chf=0.909118 |
| IE000M7V94E1 | VanEck Uranium and Nuclear Technologies UCITS ETF | Global equities | 2 | 0 | 4 | EBS / SIX | CHF | Nuclear / uranium sleeve; CHF native; physical full replication; TER 0.55%; AUM €2.4bn; ibkr_symbol=NUCL; ibkr_conid=626090692; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| IE000U58J0M1 | iShares Global Clean Energy Transition UCITS ETF | Global equities | 1 | 0 | 3 | SBF / Paris | EUR | Optional clean-energy sleeve; physical full replication; TER 0.65%; AUM €865m; ibkr_symbol=INRE; ibkr_conid=552352705; ibkr_primary_exchange=SBF; fx_to_chf=0.909118 |
| IE00BJ38QD84 | SPDR Russell 2000 US Small Cap UCITS ETF | Global equities | 2 | 0 | 4 | LSEETF / IBKR-supported venue | GBP | US small-cap sleeve; cleanest low-cost ETF route to indirect Ubiquiti (UI) exposure; physical replication; GBP/LSE listing carries an FX leg from CHF cash; validated via native IBKR contract details + live quote 2026-06-15 (bid/ask 65.10/65.16); approved by Graham with safe-word+PIN 2026-06-15; ibkr_symbol=R2SC; ibkr_conid=159310437; ibkr_primary_exchange=LSEETF; fx_to_chf=1.15 |
| CASH-CHF | CHF cash balance | Bonds / cash-like | 3 | 1 | 10 | IBKR cash balance | CHF | Reduced cash target after 2026-06-03 deconcentration deployment; keep minimal reserve. |

## Candidate Instruments
| Ticker / ISIN | Region | Theme | Name | TER | Replication | Currency | IBKR status | Notes |
|---|---|---|---|---:|---|---|---|---|
| LU0950670850 | UK | MSCI UK | UBS MSCI United Kingdom UCITS ETF GBP acc | 0.20% | physical | GBP | needs IBKR verification | Future UK sleeve candidate retained for later use. |
| IE00B44T3H88 | China | MSCI China | HSBC MSCI China UCITS ETF USD | 0.28% | physical | USD | needs IBKR verification | Broad China exposure; use only after IBKR contract truth is confirmed. |
| IE00B5L8K969 | Asia | MSCI EM Asia | iShares MSCI EM Asia UCITS ETF (Acc) | 0.20% | physical | EUR | verified (conid 78767919, IBIS2) | Broad emerging Asia exposure. Activated as EUR per operator 2026-05-28. |
| LU1781541252 | Japan | MSCI Japan | Amundi Core MSCI Japan UCITS ETF Acc | 0.12% | physical (full) | EUR | verified (conid 311572503, IBIS2) | Replaced IE00B4L5YX21 (IBKR-unresolvable). Accumulating, €5.4B AUM. |
| IE000I8KRLL9 | Global | Semiconductors / AI infrastructure | iShares MSCI Global Semiconductors UCITS ETF USD (Acc) | 0.35% | physical | EUR | verified (conid 507487999, IBIS2) | Broad semiconductor exposure with likely NVIDIA, TSMC, ASML holdings; preferred over a higher-TER thematic AI ETF. |
| IE000X59ZHE2 | Global | AI infrastructure | iShares AI Infrastructure UCITS ETF USD (Acc) | 0.35% | physical (full) | EUR | verified (conid 747339250, IBIS2) | Dedicated AI infrastructure sleeve; complements existing semis position with broader compute/network/data-center exposure. |
| IE00BGV5VN51 | Global | Artificial intelligence & big data | Xtrackers Artificial Intelligence & Big Data UCITS ETF 1C | 0.35% | physical (full) | EUR | verified (conid 352446357, IBIS2) | Broad AI / big-data thematic sleeve; substituted for the preferred robotics ETF because the current IBKR search path did not resolve IE00BYZK4552 cleanly. |
| IE00B53SZB19 | NASDAQ | Nasdaq 100 | iShares Nasdaq 100 UCITS ETF (Acc) | 0.30% | physical | USD | research-only | Best low-TER physical UCITS Nasdaq 100 candidate from the sources checked. |
| XS2940466316 | Crypto | Bitcoin ETP | iShares Bitcoin ETP | 0.15% temporary / 0.25% standard | physically backed ETP | USD | research-only | Suitable Europe/Switzerland-friendly Bitcoin alternative to US IBIT for future consideration; not UCITS and not in the ETF-only MVP lane. |
| IE00BM67HM91 | Global | Energy production | Xtrackers MSCI World Energy UCITS ETF 1C | 0.25% | physical (full) | EUR | verified (conid 227263991, IBIS2) | Broad MSCI World Energy sleeve; ~70% oil & gas majors plus integrated energy and renewables; physical full replication; AUM €1.7bn; matches portfolio's low-TER discipline. |
| IE000M7V94E1 | Global | Nuclear / uranium | VanEck Uranium and Nuclear Technologies UCITS ETF | 0.55% | physical (full) | CHF | verified (conid 626090692, EBS) | CHF-native nuclear sleeve via SIX listing — no FX leg from CHF cash; tracks MarketVector Global Uranium and Nuclear Energy Infrastructure (utilities + reactors + miners + fuel); largest pure-nuclear UCITS in Europe at €2.4bn; full physical replication. Fallback EUR listing on Paris (NUKL, conid 613031265). |
| IE000U58J0M1 | Global | Clean energy | iShares Global Clean Energy Transition UCITS ETF USD (Acc) | 0.65% | physical (full) | EUR | verified (conid 552352705, SBF) | Optional clean-energy / renewables overweight separate from XDWE; tracks S&P Global Clean Energy Transition (~100 holdings); full physical replication; AUM €865m; INRE on Paris is the preferred listing (tightest spread, no FTT, EUR-native). Avoid INRA-LSE (UK SDRT 0.5%). |

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
- Require user approval for sales: yes

## Notes / Open Questions
- ETF issuer preferences: prefer UBS and iShares; exclude Invesco.
- Replacement validated through native IBKR contract details for the UBS Core S&P 500 alternative; use that line for future S&P 500 sleeve proposals.
- Future instrument consideration list retained: CH0032912732, CH0130595124, LU0950668870, LU0950670850, IE00B5BMR087, IE00B44T3H88, IE00B5L8K969, LU1781541252, IE000I8KRLL9, IE000X59ZHE2, IE00BGV5VN51, US37950E2596.
- Already-held instruments note: none
- Defensive sleeve is intentionally held as CHF cash for this starter-scale MVP portfolio; revisit a CHF money-market or short-duration bond ETF later if portfolio size and trading costs justify it.
- 2026-05-22 rebalance decision: treat the settled IBKR broker cash balance (CHF 20,841.44 at last holdings sync) as the active defensive sleeve allocation for now, rather than forcing additional buys while the ETF sleeve cash bucket remains zero in portfolio-local accounting.
- 2026-05-28 target policy reset: after adding Japan and SEC0, targets were reworked into rounded strategic ranges close to the live six-holding portfolio (rather than exact snapshot-lock percentages) so drift once again means something operational.
