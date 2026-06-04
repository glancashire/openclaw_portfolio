# K-series energy sleeve — plan stub (PARKED)

**Status:** PARKED — research complete, no go-ahead from Graham yet
**Date stub created:** 2026-06-04
**Lifts on:** Graham says "build the energy sleeve" or similar
**Predecessor:** `docs/research/energy-nuclear-screening-2026-06-04.md` + `docs/research/energy-nuclear-preflight-2026-06-04.md`

This is a forward-looking plan stub. Lives in research, not active plans, because no decision has been made. When/if Graham commits, lift this into `plans/` and execute.

---

## Final shortlist (post-research)

| Role | Ticker | Venue | Conid | Currency | TER | AUM | Target % |
|---|---|---|---:|---|---:|---:|---:|
| Broad energy | **XDWE** | Xetra | 227263991 | EUR | 0.25% | €1.7bn | 2–3% |
| Nuclear | **NUCL** | SIX | 626090692 | **CHF** | 0.55% | ~€2.4bn | 1–2% |
| Clean energy (optional) | **INRE** | Paris | 552352705 | EUR | 0.65% | €865m | 1–2% |

---

## Phase K1 — Energy sleeve baseline

Mirrors H1 — capture pre-trade snapshot.

**Acceptance criteria:**
1. Live-hours quote captured for all three (cron `141064ee` does this Friday 13:00 UTC)
2. ADV (30-day average daily volume) pulled per venue
3. Tracking-difference history pulled (1y, 3y if available)
4. Pre-trade portfolio snapshot saved to `docs/research/k1-baseline-<date>.json`
5. Allocation plan written: target % per ETF, cash drawdown plan, FX plan (EUR for XDWE/INRE, CHF for NUCL = no FX needed)

**Read-only.** No trades, no changes to portfolio.md.

---

## Phase K2 — Basket proposal

Mirrors the H1 basket-build flow used on 2026-06-03.

**Acceptance criteria:**
1. Basket proposal generated using `scripts/generate-portfolio-basket-proposal.js` or equivalent
2. Cost preview: estimated CHF spend, broker fees, FX cost (zero for NUCL)
3. Drift impact: pre/post sector concentration, top-holding overlap
4. Three baskets generated (one per target sleeve size: 4% / 6% / 8%)
5. **STOP** — operator approval gate

**Operator-gated.** Graham reviews and selects size + path forward. No auto-transmit.

---

## Phase K3 — Approve and execute

Same flow as the 2026-06-03 deconcentration basket.

1. Graham signs off via the approval safe-word
2. Live-execution script transmits the chosen basket
3. Fill-monitor cron enabled (`d4c3207d-…`)
4. Post-fill: reconcile, snapshot, holdings update, history append, fill-monitor cron disabled

**Operator-driven.** bb8 only runs the post-fill reconciliation steps autonomously.

---

## Phase K4 — Sleeve baseline freeze (post-execution)

Like H1 after the deconcentration basket fills:
1. Capture post-fill allocation snapshot
2. Set 14-day review checkpoint for sleeve drift convergence
3. Update `portfolio.md` with new target allocations
4. Update `MEMORY.md` with sleeve composition + rationale

---

## What's NOT in scope

- Auto-rebalancing the new sleeve (manual review only, like H1)
- Replacing existing SXR8/EMUAA — that's the H2 decision, separate
- Touching cash management beyond the basket spend
- Adding more thematic ETFs (water, AI, etc.) — separate research if requested

---

## Activation steps (when Graham says go)

1. Move this file from `docs/research/` to `plans/phase-k1-energy-baseline.md`
2. Run K1 acceptance criteria
3. Commit baseline doc + JSON
4. Wait for "build the basket" to start K2

---

## Pre-drafted `portfolio.md` candidate-instrument rows

When Graham gives the go, append these rows to the **Candidate Instruments** table in `portfolio/etf/portfolio.md`. Format matches the existing rows exactly. No edits to the **Approved Instruments** table or allocation targets at this stage — those happen in K2/K3 after basket sizing.

```markdown
| IE00BM67HM91 | Global | Energy production | Xtrackers MSCI World Energy UCITS ETF 1C | 0.25% | physical (full) | EUR | verified (conid 227263991, IBIS2) | Broad MSCI World Energy sleeve; ~70% oil & gas majors plus integrated energy and renewables; physical full replication; AUM €1.7bn; matches portfolio's low-TER discipline. |
| IE000M7V94E1 | Global | Nuclear / uranium | VanEck Uranium and Nuclear Technologies UCITS ETF | 0.55% | physical (full) | CHF | verified (conid 626090692, EBS) | CHF-native nuclear sleeve via SIX listing — no FX leg from CHF cash; tracks MarketVector Global Uranium and Nuclear Energy Infrastructure (utilities + reactors + miners + fuel); largest pure-nuclear UCITS in Europe at €2.4bn; full physical replication. Fallback EUR listing on Paris (NUKL, conid 613031265). |
| IE000U58J0M1 | Global | Clean energy | iShares Global Clean Energy Transition UCITS ETF USD (Acc) | 0.65% | physical (full) | EUR | verified (conid 552352705, SBF) | Optional clean-energy / renewables overweight separate from XDWE; tracks S&P Global Clean Energy Transition (~100 holdings); full physical replication; AUM €865m; INRE on Paris is the preferred listing (tightest spread, no FTT, EUR-native). Avoid INRA-LSE (UK SDRT 0.5%). |
```

If the K2 sleeve sizing decision lands at one of the targets in `k1-energy-baseline-2026-06-04.json`, also append to **Approved Instruments**:

```markdown
| IE00BM67HM91 | Xtrackers MSCI World Energy UCITS ETF 1C | Global equities | 2 | 0 | 4 | IBIS2 / Xetra | EUR | Energy production sleeve; physical full replication; TER 0.25%; AUM €1.7bn; ibkr_symbol=XDW0; ibkr_conid=227263991; ibkr_primary_exchange=IBIS2; fx_to_chf=0.96 |
| IE000M7V94E1 | VanEck Uranium and Nuclear Technologies UCITS ETF | Global equities | 2 | 0 | 4 | SIX / EBS | CHF | Nuclear / uranium sleeve; CHF native; physical full replication; TER 0.55%; AUM €2.4bn; ibkr_symbol=NUCL; ibkr_conid=626090692; ibkr_primary_exchange=EBS; fx_to_chf=1 |
| IE000U58J0M1 | iShares Global Clean Energy Transition UCITS ETF | Global equities | 1 | 0 | 3 | SBF / Paris | EUR | Optional clean-energy sleeve; physical full replication; TER 0.65%; AUM €865m; ibkr_symbol=INRE; ibkr_conid=552352705; ibkr_primary_exchange=SBF; fx_to_chf=0.96 |
```

Target % values above are **placeholders** matching the medium-6% sleeve from the K1 baseline JSON (`split: XDWE 3% / NUCL 2% / INRE 1%`). Adjust based on K2 basket sizing. Min/Max bands set to allow normal drift without breaching constraints.

**Existing target adjustments needed if sleeve added:** the current Approved Instruments table sums to ~108% on top-line targets (rebalance buffers). Adding 5–7% energy pushes it further. K2 needs to either trim Cash CHF target (currently 3%) or shave the deconcentration sleeves (XDEW/MWEQ/IS3H/DXS0) that are still ramping. Operator decision.
