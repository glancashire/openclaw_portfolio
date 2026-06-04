# Energy + Nuclear ETF preflight verification — 2026-06-04

**Status:** Pre-trade verification complete for the three top picks from `energy-nuclear-screening-2026-06-04.md`. Read-only. No allocation decision yet.

**Verified at:** 2026-06-04 20:22 UTC (post-market — XETRA closed 17:30, AEX 16:30, LSE 16:30)
**Source:** Live IBKR via `scripts/search-interactive-brokers-instruments.js` + `scripts/fetch-interactive-brokers-price.js`

---

## Summary

| Pick | Resolved on IBKR | Best venue | Live quote | Verdict |
|---|---|---|---|---|
| **XDWE** | ✅ conid 227263991 | Xetra EUR (IBIS2) | bid €61.53 / ask €62.20 (close snap) | ready to slot |
| **NUUR** | ✅ conid 825813453 | AEX USD | last $6.233 (close, no live bid/ask) | ready, recheck spread during US/EU overlap |
| **INRA** | ✅ 3 listings (USD/EUR/GBP) | Paris EUR (INRE) | bid €29.28 / ask €29.425 (close snap) | ready, INRE preferred over INRA-LSE/AEX |

All three resolve cleanly on IBKR. No conid-resolution surprises.

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
| Stamp duty | None (NL) |
| Suitable | ✅ — need live bid/ask check during EU hours before sizing the trade |

**Notes:** NUUR's only physically-replicated venue is AEX-USD. Lower AUM (~€220m) means tighter live spreads matter. Recommend re-running the quote probe during the 09:00-16:30 UTC window before any basket build to get a real spread reading. Currency mismatch (portfolio is CHF, NUUR is USD) — same as SXR8/EMUAA, IBKR's CHF-USD FX path is well-tested.

**Alternatives if AEX-USD spread is too wide live:** No EUR-listed Acc share class exists for NUUR. The closest cheap alternative is NUKL/NUCL (VanEck, IE000M7V94E1, 0.55% TER, larger AUM ~€1.2bn) which lists on Xetra in EUR — would give better in-portfolio currency consistency at +15 bps higher TER.

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

- [ ] **Live spread during EU hours** for NUUR (only had close snap with bid/ask = 0)
- [ ] **30-day average daily volume** at preferred venues (need to pull from justETF / Morningstar)
- [ ] **Tracking-difference history** (factsheet inspection — last 1y / 3y vs index)
- [ ] **Withholding tax verification** for Irish-domiciled funds in Swiss tax treatment (general rule: 15% recoverable via Swiss DA-1, but worth a sanity check)
- [ ] **Confirm physical full replication still applies** on the latest factsheets — VanEck and Global X have switched to optimised sampling on some thematic funds; iShares + Xtrackers tend to stay physical-full

---

## Recommended next move

If Graham wants to add an energy sleeve:

1. **Schedule a live-hours quote probe** (any weekday 09:00-16:30 UTC) to get tight spread + ADV reads on NUUR-AEX and INRE-PAR
2. **Pull factsheets** for tracking difference + sampling confirmation
3. **Then** build a K1-baseline doc + K2 basket proposal under the same approval gate flow used for the H1 deconcentration basket

If Graham is **not** sure about the sleeve yet:

- This doc + the screening doc are sufficient. Park until decision.

---

## Decisions for Graham

| # | Question | Recommendation |
|---|---|---|
| 1 | Add an energy/nuclear sleeve to the portfolio? | ⏸ defer — not on H2 critical path |
| 2 | Run live-hours quote probe tomorrow (Fri 2026-06-05)? | Auto-schedule a one-shot cron at 13:00 UTC if you say go |
| 3 | Draft K1 baseline + K2 basket plan now? | ⏸ defer until you commit to the sleeve |

**Net:** infrastructure is verified. All three picks resolve cleanly on IBKR. Costs are within the 0.25-0.65% TER band you'd want. Stamp duty is zero on the recommended venues (Xetra / AEX / Paris). Nothing left to do here unless you want to commit to building the sleeve.
