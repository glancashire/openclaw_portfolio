# UBSPX Alternatives Decision Support

Captured: 2026-05-21
Purpose: operator-facing replacement guidance if UBSPX remains operationally unreliable despite execution-path hardening.

## Current issue context
UBSPX (`IE00BD4TXW66`) remains attractive on paper, but repeated live attempts failed operationally in the current IBKR execution path. This artifact separates **fund quality** from **execution confidence** so a replacement decision does not over-index on TER alone.

## Evaluation lens
Candidates are judged on:
1. physical replication only
2. accumulating share class preferred
3. low TER
4. likely operational friendliness on common European venues / IBKR routing
5. reasonable size / mainstream product line

## Recommended ordering

### Tier 1 — Best operational-confidence fallbacks
1. **iShares Core S&P 500 UCITS ETF USD (Acc)** — `IE00B5BMR087`
   - Why: very mainstream product line, strong operational confidence, widely used core allocation vehicle.
   - Tradeoff: not always the absolute lowest TER in every comparison, but very strong reliability profile.
   - Operational view: best default replacement if execution reliability matters more than squeezing the last few basis points.

2. **Vanguard S&P 500 UCITS ETF (Acc)** — `IE00BFMXXD54`
   - Why: strong sponsor, mainstream core product, attractive long-term default for simple accumulation exposure.
   - Tradeoff: may not match the very cheapest option in every venue-specific comparison.
   - Operational view: another high-confidence default replacement.

### Tier 2 — Low-TER physical candidates worth validating
3. **Xtrackers S&P 500 UCITS ETF 4C** — `IE000Z9SJA06`
   - Why: low-cost physical candidate with appealing fund-attribute profile.
   - Tradeoff: execution/routing confidence should be validated before preferring it over iShares/Vanguard.
   - Operational view: strong candidate if routing/liquidity checks look clean.

4. **SPDR S&P 500 UCITS ETF USD Unhedged (Acc)** — `IE000XZSV718`
   - Why: another low-cost physical option from a major sponsor.
   - Tradeoff: should still be validated for local venue/routing behavior in this execution stack.
   - Operational view: plausible backup, but not the first operational-confidence pick.

### Tier 3 — Keep only if execution path proves stable
5. **UBS Core S&P 500 UCITS ETF USD acc (UBSPX)** — `IE00BD4TXW66`
   - Why: excellent on-paper characteristics, including low TER and physical replication.
   - Tradeoff: current live execution history makes it operationally suspect until proven otherwise.
   - Operational view: do not treat low TER as sufficient justification while broker execution remains fragile.

## Explicit exclusions
- **Invesco S&P 500 UCITS ETF / synthetic line** — `IE00B3YCGJ38`
  - Excluded because synthetic exposure is outside the preferred product profile for this sleeve.

## Practical recommendation
If Graham wants the **highest-confidence operational replacement today**, prefer:
1. iShares Core S&P 500 Acc
2. Vanguard S&P 500 Acc

If Graham wants to preserve **lowest-TER discipline while staying physical**, validate next:
1. Xtrackers 4C
2. SPDR Acc
3. only then reconsider UBSPX if the execution-path diagnostics eventually become boring and reliable

## What this artifact does *not* claim
- It does not prove live routing success for any alternative in the current stack.
- It does not replace explicit approval for live changes.
- It does not override portfolio constraints or future broker diagnostics.

## Next operator step if replacement is desired
1. pick the preferred candidate from Tier 1 or Tier 2
2. add/confirm approved-instrument metadata in `portfolio/etf/portfolio.md`
3. run dry-run and readiness diagnostics first
4. only then consider a fresh explicitly approved live attempt
