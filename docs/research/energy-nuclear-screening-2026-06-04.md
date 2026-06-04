# Energy production + nuclear ETF screening — 2026-06-04

**Status:** Research only — no allocation decision yet. Surfaces shortlist for a future H-followup phase if Graham wants to add an energy sleeve.

**Author:** bb8
**Filter criteria:** UCITS · physical replication (full preferred) · Acc share class · low TER · IBKR-tradeable on Swiss-friendly venues

---

## Why this exists

The current portfolio has zero direct energy or nuclear exposure beyond whatever bleeds through SXR8 (~3% energy sector) and EMUAA (~5%). Graham asked which instruments would be interesting if we wanted to add a deliberate energy production + nuclear tilt with the same low-TER, physical, accumulating discipline as the rest of the portfolio.

This doc is the screening output. It does NOT recommend changing portfolio allocation today — that decision waits for the H2 review on 2026-06-17 or until Graham explicitly says "add an energy sleeve".

---

## ☢️ Nuclear / Uranium shortlist

| Ticker | ISIN | Name | TER | Replication | Acc/Dist | AUM (approx) | Index |
|---|---|---|---:|---|---|---:|---|
| **NUUR** | IE000BMZP0I6 | iShares Nuclear Energy and Uranium Mining | **0.40%** | Physical (full) | Acc | ~€220m | STOXX Global Nuclear Energy & Uranium Mining |
| **NUKL / NUCL** | IE000M7V94E1 | VanEck Uranium and Nuclear Technologies | 0.55% | Physical (full) | Acc | ~€1.2bn | MarketVector Global Uranium & Nuclear Energy Infrastructure |
| **URNU / URND** | IE000NDWFGA5 | Global X Uranium UCITS | 0.65% | Physical (full) | Acc | ~€700m | Solactive Global Uranium & Nuclear Components |
| **NUKZ** | (hanetf) | Nuclear Renaissance UCITS | 0.69% | Physical | Acc | small | Custom nuclear-renaissance basket |

**Top pick: NUUR** — cheapest TER, broadest mandate (utilities + miners + fuel), physical full replication, accumulating. Smaller AUM than NUKL but growing; spreads acceptable on AEX / LSE.

**Runner-up: NUKL** — bigger AUM, similar exposure with stronger reactor-utilities tilt. Worth picking if you want maximum liquidity for a 1–3% sleeve.

**Skip:** URNU is uranium-miner-heavy and more volatile; NUKZ is too thin for now.

---

## 🔌 Broad energy production shortlist

| Ticker | ISIN | Name | TER | Replication | Acc/Dist | AUM (approx) | Index |
|---|---|---|---:|---|---|---:|---|
| **XDWE / XDWS** | IE00BM67HM91 | Xtrackers MSCI World Energy 1C | **0.25%** | Physical (full) | Acc | ~€800m | MSCI World Energy |
| **WENS** | IE00BJ5JNZ06 | iShares MSCI World Energy Sector | 0.25% | Physical (sampling) | Inc only | ~€500m | MSCI World Energy |
| **WNRG** | IE00BYWZ0489 | SPDR MSCI World Energy | 0.30% | Physical | Acc | ~€100m | MSCI World Energy |

**Top pick: XDWE** — lowest TER, full replication, accumulating, large AUM. Cap-weighted toward oil & gas majors (Exxon/Chevron/Shell/TotalEnergies). If you want broad energy production and don't mind oil dominance, this is the cleanest match for the existing portfolio's low-TER profile.

**Skip WENS** — distributing only, breaks the Acc compounding pattern.

---

## ☀️ Clean / renewable energy production (optional split)

| Ticker | ISIN | Name | TER | Replication | Acc/Dist | AUM (approx) | Index |
|---|---|---|---:|---|---|---:|---|
| **INRA / IQQH** | IE000U58J0M1 | iShares Global Clean Energy Transition | 0.65% | Physical (full) | Acc | ~€4bn | S&P Global Clean Energy Transition |

**Pick INRA** if you want a separate clean-energy sleeve. Largest clean-energy UCITS, full physical replication, accumulating. TER is higher (0.65%) because it's thematic, but it's the only credible Acc option at scale.

---

## Suggested combination (if you decide to add a sleeve)

Three lean adds, total ~5–7% of portfolio:

| Role | Ticker | TER | Target % | Rationale |
|---|---|---:|---:|---|
| Broad energy (oil + gas + renewables) | **XDWE** | 0.25% | 2–3% | Cap-weighted core, lowest TER |
| Nuclear / uranium thematic | **NUUR** | 0.40% | 1–2% | Pure nuclear exposure, cheapest TER in segment |
| Clean energy thematic (optional) | **INRA** | 0.65% | 1–2% | If you want renewables overweight separate from XDWE |

Weighted TER on the new sleeve: ~0.35–0.45% — close to the existing portfolio's blended TER. Keeps cost drag minimal.

---

## Risks / caveats

- **Thematic concentration.** Nuclear (NUUR) and clean-energy (INRA) ETFs hold 30–80 names and can swing ±20% on a single commodity or policy headline. Size to 1–2%, not 5%.
- **Oil-price coupling.** XDWE is ~70% oil & gas. If the goal is "energy production" without oil dominance, INRA is the better single pick despite the higher TER.
- **Swiss stamp duty + venue choice.** Some IBKR venues (LSE GBP / Xetra EUR / AEX EUR) carry different stamp/tax treatment for Swiss residents. Pre-trade check in IBKR's fee preview is mandatory before any transmission.
- **Conid + venue resolution.** Not yet verified for these tickers. Would run the same conid-resolution preflight pattern we used for XDEW / MWEQ / IS3H / DXS0 on 2026-06-03 before any basket build.
- **Withholding tax.** Irish-domiciled funds (IE…) are the standard low-friction choice for Swiss residents on US-equity-heavy mandates. All shortlisted instruments are Irish-domiciled.

---

## Pre-trade verification checklist (run before any basket build)

- [ ] Live IBKR conid resolution per ticker + preferred venue (LSE / Xetra / AEX / SIX)
- [ ] Currency exposure check (USD vs EUR vs GBP listing — match to existing CHF→USD/EUR FX path)
- [ ] 30-day average daily volume + bid/ask spread sample at the chosen venue
- [ ] AUM + tracking-difference history (Morningstar / justETF)
- [ ] Stamp duty / Swiss withholding treatment per venue
- [ ] Confirm physical replication (some VanEck and Global X products switched to optimised sampling — check current factsheet)
- [ ] Verify Acc share class is the one tradeable in chosen venue (some venues only list Dist class)

---

## How this connects to existing planning

- **Not blocking H2 (2026-06-17 review).** The H2 decision is about the existing deconcentration ETFs (XDEW / MWEQ / IS3H / DXS0) vs SXR8 + EMUAA. Adding an energy sleeve is a separate, additive question.
- **If Graham says "add the sleeve" later,** this doc becomes the pre-build research input for a new phase (e.g. K1 — energy-sleeve baseline → K2 — basket proposal → operator approval gate).
- **No autonomous build yet.** Surface only.

---

## Decisions for Graham

1. **Want a fuller pre-trade verification pass on XDWE / NUUR / INRA?** (live IBKR conids, ADV, spread, stamp duty per venue)
   - **Recommend:** ⏸ wait until you decide the sleeve is in scope. If you want it now anyway, just say "verify the energy three".
2. **Want this on the H2 agenda for 2026-06-17?**
   - **Recommend:** ⏸ keep separate. H2 is already a path-A/B/C decision on the existing sleeve. Energy can be a fresh K-series phase on its own date.
3. **Want bb8 to draft the K1 baseline + K2 basket-proposal plan now?** (parked, ready when you say go)
   - **Recommend:** ⏸ defer until you're sure you want the sleeve. Less paperwork to retire.
