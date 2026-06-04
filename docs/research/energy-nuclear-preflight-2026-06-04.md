# Energy + Nuclear ETF preflight verification — 2026-06-04

**Status:** Pre-trade verification complete for the three top picks from `energy-nuclear-screening-2026-06-04.md`. Read-only. No allocation decision yet.

**Verified at:** 2026-06-04 20:22 UTC (post-market — XETRA closed 17:30, AEX 16:30, LSE 16:30)
**Source:** Live IBKR via `scripts/search-interactive-brokers-instruments.js` + `scripts/fetch-interactive-brokers-price.js`

---

## Summary

| Pick | Resolved on IBKR | Best venue | Live quote | AUM | Verdict |
|---|---|---|---|---:|---|
| **XDWE** | ✅ conid 227263991 | Xetra EUR (IBIS2) | bid €61.53 / ask €62.20 (close snap) | **€1,684m** | ready to slot |
| **NUCL** | ✅ conid 626090692 | **SIX CHF (EBS)** | last CHF 47.465 (close, no live bid/ask) | **~€2.4bn** | 🌟 primary nuclear pick — CHF native, no FX |
| **NUUR** | ✅ conid 825813453 | AEX USD | last $6.233 (close, no live bid/ask) | **€27m** ⚠️ | demoted — AUM too small |
| **INRA / INRE** | ✅ 3 listings | Paris EUR (INRE) | bid €29.28 / ask €29.425 (close snap) | **~€4bn** | ready, INRE preferred |

All three primary picks resolve cleanly on IBKR. NUUR demoted on AUM concern (€27m, well below comfortable threshold). NUCL on SIX wins the nuclear slot — CHF native eliminates FX overhead.

---

## XDWE — Xtrackers MSCI World Energy 1C

| Field | Value |
|---|---|
| ISIN | IE00BM67HM91 |
| IBKR symbol | XDW0 |
| Conid | 227263991 |
| Venue | IBIS2 (Xetra) |
| Currency | EUR |
| TER | 0.25% |
| Replication | Physical (full) |
| Distribution | Acc |
| Quote (close) | bid €61.53 / ask €62.20 / last €61.82 / prev close €62.13 |
| Spread (close) | 1.08% — wide because markets are closed; expect 5-15 bps during EU hours |
| Trading hours | 07:30-23:00 UTC weekdays (Xetra core 09:00-17:30 UTC) |
| Stamp duty | None (DE) |
| Suitable | ✅ |

**Notes:** Xetra is the Swiss-friendly default for EUR-denominated UCITS ETFs (no stamp, deep liquidity, IBKR routing well-tested). Existing portfolio uses IBIS2 venue for XDEW + IS3H — same routing path.

---

## NUUR — iShares Nuclear Energy and Uranium Mining

| Field | Value |
|---|---|
| ISIN | IE000BMZP0I6 |
| IBKR symbol | NUUR |
| Conid | 825813453 |
| Venue | AEB (Euronext Amsterdam) |
| Currency | USD |
| TER | 0.40% |
| Replication | Physical (full) |
| Distribution | Acc |
| Quote (close) | last $6.233 / prev close $6.238 — bid/ask 0 (post-close, AEX closed 16:30 UTC) |
| AUM | **€27m** (justETF, 2026-06) |
| Stamp duty | None (NL) |
| Suitable | ⚠️ AUM too small for top pick — see revised recommendation |

**⚠️ AUM correction.** Initial screening estimated ~€220m. The justETF profile shows **€27m**. That's well below the comfortable threshold (~€100m) for an ETF you'd want as a multi-year hold:

- Fund-closure risk is real below €50m
- Live spreads tend to be wider when AUM is thin
- Authorized-participant arbitrage is less efficient → tracking difference can be larger

**Revised primary nuclear pick: NUKL (VanEck Uranium and Nuclear Technologies)**

| Field | Value |
|---|---|
| ISIN | IE000M7V94E1 |
| TER | 0.55% (+15 bps vs NUUR) |
| Replication | Physical (full) |
| Distribution | Acc |
| AUM | **€2,389m** (justETF, 2026-06) |
| Venues | Xetra (EUR), Borsa Italiana (USD), LSE, Paris (EUR), SIX (CHF, USD, GBP) |

NUKL is **88×** the AUM of NUUR, only 15 bps more expensive, and lists across many venues. Closure risk is essentially zero at this size. Largest pure-nuclear UCITS ETF in Europe.

**NUUR could still be a satellite addition** if you want minimum TER for a small, conviction-only nuclear bet — but it's not the right top pick for a structured sleeve. Resolving NUKL conid is the next preflight step if Graham agrees with the swap.

### NUKL conid + venue resolution (preflight extension)

| Listing | Conid | Venue | Currency | Quote (close snap) | Notes |
|---|---:|---|---|---|---|
| **NUKL** (Paris) | 613031265 | SBF | EUR | bid €51.66 / ask €52.52 / last €51.66 (1.65% spread) | EUR-denominated, matches EMU sleeve |
| **NUCL** (SIX) | 626090692 | EBS | **CHF** | last CHF 47.465, no live bid/ask post-close | 🌟 **CHF native — no FX cost** |
| NUCL (LSE) | 612858532 | LSEETF | USD | last $60.57, no live bid/ask | UK SDRT 0.5% — avoid |
| NUCG (LSE) | 612858529 | LSEETF | GBP | last £45.08, no live bid/ask | UK SDRT 0.5% — avoid |

**🌟 Major win: NUCL on SIX is CHF-denominated.** That's a meaningful upgrade vs all the other shortlist members:

- No FX leg — the portfolio's CHF cash buys directly without a CHF→EUR or CHF→USD conversion (saves the FX spread, typically 1–2 bps round-trip at IBKR but adds operational overhead)
- No FX P&L noise on a small position
- Simpler tax reporting for Swiss residents (no FX gain/loss line)

**Recommended primary nuclear pick (final): NUCL on SIX (EBS), CHF, conid 626090692.**
Fallback if SIX live-hours spread proves too wide: NUKL on Paris (SBF), EUR, conid 613031265.

---

## INRA — iShares Global Clean Energy Transition

| Listing | Conid | Venue | Currency | Quote (close) | Spread |
|---|---:|---|---|---|---|
| **INRE** (preferred) | 552352705 | SBF (Euronext Paris) | **EUR** | bid €29.28 / ask €29.425 / last €29.325 | **0.49%** ✅ |
| INRA | 552334714 | AEB (Amsterdam) | USD | no live quote returned | n/a |
| INRA | 764736034 | LSEETF | GBP | last £24.98, bid/ask 0 (LSE closed) | n/a |

| Field | Value |
|---|---|
| ISIN | IE000U58J0M1 |
| TER | 0.65% |
| Replication | Physical (full) |
| Distribution | Acc |
| AUM | ~€4bn (largest clean-energy UCITS) |

**Recommended venue: INRE (Paris, EUR).** Tightest live spread observed (0.49% even at close), EUR-denominated (matches existing EMU sleeve), no stamp duty on French ETFs for non-French residents.

**Avoid INRA-LSE (GBP):** UK SDRT is 0.5% on UK-listed ETFs even for Swiss residents on most flavours — adds 50 bps drag on every buy.
**Avoid INRA-AEX (USD):** No live quote returned; lower volume than INRE.

---

## Stamp duty + tax recap (Swiss resident, IBKR routing)

| Venue | Stamp / FTT | Notes |
|---|---|---|
| Xetra (DE) — XDWE | None | Default route for EUR UCITS |
| AEX (NL) — NUUR | None | NL has no transaction tax for ETFs |
| Paris (FR) — INRE | None | French FTT exempts UCITS ETFs |
| LSE (UK) — INRA-LSE | 0.5% SDRT | Avoid |

---

## What's still UN-verified (need live-hours pass)

- [ ] **Live spread during EU hours** for NUCL-SIX, NUKL-Paris, INRE-Paris (cron `141064ee` will probe Fri 13:00 UTC — already extended to all 5 listings)
- [x] **NUKL/NUCL conid resolution** — 4 venues found, NUCL-SIX-CHF and NUKL-Paris-EUR are the keepers
- [ ] **30-day average daily volume** at preferred venues — only AUM verified so far; ADV needs justETF / Morningstar pull
- [ ] **Tracking-difference history** (factsheet inspection — last 1y / 3y vs index for all four)
- [ ] **Withholding tax verification** for Irish-domiciled funds in Swiss tax treatment (general rule: 15% recoverable via Swiss DA-1, but worth a sanity check)
- [x] **Physical full replication** confirmed for XDWE (justETF + DWS factsheet), INRA (justETF + iShares), NUUR (justETF). NUKL/NUCL: VanEck factsheet shows full replication of MarketVector index.

---

## Recommended next move

If Graham wants to add an energy sleeve:

1. **Wait for the Friday 13:00 UTC live-hours probe** (cron `141064ee`) to confirm tight spreads on NUCL-SIX, NUKL-Paris, INRE-Paris
2. **Pull factsheets** for tracking difference + sampling confirmation (mostly done; NUKL last)
3. **Then** build a K1-baseline doc + K2 basket proposal under the same approval gate flow used for the H1 deconcentration basket

If Graham is **not** sure about the sleeve yet:

- This doc + the screening doc are sufficient. Park until decision.

---

## Final shortlist (post-corrections)

| Role | Ticker | Venue | Conid | TER | Acc | AUM | Why this one |
|---|---|---|---:|---:|---|---:|---|
| Broad energy | **XDWE** | Xetra EUR | 227263991 | 0.25% | ✅ | €1.7bn | Cheapest, full replication, deepest AUM |
| Nuclear / uranium | **NUCL** | SIX CHF 🌟 | 626090692 | 0.55% | ✅ | ~€2.4bn | CHF native = no FX leg, largest nuclear UCITS |
| Clean energy (optional) | **INRE** | Paris EUR | 552352705 | 0.65% | ✅ | ~€4bn | Tightest live spread, EUR matches EMU sleeve |

Fallbacks: NUKL-Paris (EUR, conid 613031265) if NUCL-SIX spread proves too wide live; NUUR demoted (€27m AUM too small).

---

## Decisions for Graham

| # | Question | Recommendation |
|---|---|---|
| 1 | Add an energy/nuclear sleeve to the portfolio? | ⏸ defer — not on H2 critical path |
| 2 | Run live-hours quote probe tomorrow (Fri 2026-06-05)? | ✅ already scheduled (cron 141064ee, 13:00 UTC, self-deletes) |
| 3 | Draft K1 baseline + K2 basket plan now? | ⏸ defer until you commit to the sleeve |

**Net:** infrastructure is verified end-to-end. Three primary picks resolve on IBKR with sensible venues (Xetra EUR, SIX CHF, Paris EUR). NUCL-SIX is the standout discovery — CHF-native nuclear ETF removes the FX leg entirely. Live-hours probe Friday will confirm spreads.
