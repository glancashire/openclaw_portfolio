# H1 Allocation Baseline — 2026-06-03

## Deconcentration thesis

The original portfolio was 39% S&P 500 (SXR8) + 14% MSCI EMU (EMUAA), giving the top-6 mega-caps (Apple/Microsoft/Nvidia/Amazon/Alphabet/Meta + ASML/SAP/LVMH) an implicit weighting of ~15%. A CHF 20k basket deployed on 2026-06-03 added four equal-weight / mid-cap / capped ETFs to reduce top-holding concentration while keeping the same geographic and factor exposure:

- **XDEW** — S&P 500 Equal Weight (dilutes Mag-7 from ~35% to ~0.4% per name)
- **MWEQ** — MSCI World Equal Weight (dilutes globally across ~1,400 names)
- **IS3H** — MSCI EMU Mid Cap (sidesteps ASML/SAP/LVMH mega-cap dominance)
- **DXS0** — SLI capped (limits Nestlé/Roche/Novartis/UBS at ≤9% each vs ~50% in SMI)

## Baseline snapshot (T+0)

Captured: 2026-06-03 ~16:42 UTC (same business day as fills, post-resync)
Source: `docs/research/h1-baseline-2026-06-03.json`

| Instrument | ISIN | Role | Qty | Price | Cur | Value CHF | Current % | Target % | Drift |
|---|---|---|---:|---:|---|---:|---:|---:|---:|
| SXR8 | IE00B5BMR087 | Legacy mega-cap | 39 | 702.96 | EUR | 25,000 | 17.65 | 25 | −7.35 |
| EMUAA | LU0950668870 | Legacy mega-cap | 447 | 40.89 | EUR | 16,666 | 11.77 | 14 | −2.23 |
| XDEW | IE00BLNMYC90 | Deconcentration | 82 | 100.16 | EUR | 7,489 | 5.29 | 6 | −0.71 |
| MWEQ | IE000OEF25S1 | Deconcentration | 903 | 5.74 | EUR | 4,722 | 3.33 | 4 | −0.67 |
| IS3H | IE00BCLWRD08 | Deconcentration | 54 | 76.51 | EUR | 3,767 | 2.66 | 3 | −0.34 |
| DXS0 | LU0322248146 | Deconcentration | 12 | 245.40 | EUR | 2,685 | 1.90 | 2 | −0.10 |

**Combined new sleeve:** 13.18% current / 15% target / drift −1.82%
**Combined legacy overlap:** 29.42% current / 39% target / drift −9.58%
**Total portfolio:** CHF 141,621

## Review checkpoint: 2026-06-17

After ~10 trading days, compare against this baseline:

1. Drift convergence — have the new ETFs converged toward target, or are they drifting wider?
2. Tracking fidelity — any data gaps, price staleness, or FX anomalies?
3. Dividend / income events — any distributions captured or missed (DXS0 is distributing)?
4. Liquidity experience — were the fills clean, or were there large spreads / partial fills?

## Decision matrix (to be resolved at review)

| Path | Description | When to choose |
|---|---|---|
| **A: Additive** | Keep SXR8+EMUAA at current targets (25/14%), layer new ETFs alongside (total allocated = 54%) | If new ETFs are stable AND you still want max diversification across both cap-weighted and equal-weight flavours |
| **B: Replace** | Phase out SXR8+EMUAA (sell down to 0 over 2-3 rebalances), shift allocation entirely to new ETFs | If equal-weight / mid-cap performance and deconcentration benefit clearly dominate AND you accept the tracking difference |
| **C: Partial** | Reduce SXR8 from 25→15% and EMUAA from 14→8%, raise new ETFs proportionally | If you want a middle ground: reduce mega-cap tilt without abandoning cap-weighted core |

## Files

- Baseline JSON: `docs/research/h1-baseline-2026-06-03.json`
- Capture script: `scripts/capture-allocation-baseline.js`
- This document: `docs/research/h1-allocation-baseline-2026-06-03.md`
