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
