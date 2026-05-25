# Phase 179 — UBSPX Execution Diagnostics and Venue Hardening

## Goal
Eliminate avoidable live-order surprises in the ETF execution path by making venue/timing/contract diagnostics visible before submission, normalizing venue handling across submit paths, and producing a grounded operator-ready replacement analysis for the UBSPX sleeve.

## Why this phase exists
Repeated UBSPX live failures exposed three systemic gaps:
1. execution paths disagree on venue and primary exchange assumptions;
2. market-open gating is too generic (`EBS`) for non-SIX European ETF routing;
3. critical broker diagnostics arrive or persist too late, making failures visible only after live submission.

This phase focuses on diagnosis-first hardening rather than more blind retries.

## Phase breakdown

### Phase 179A — Canonical venue/contract diagnostics and pre-submit truth surface
**Objectives**
- Build a canonical pre-submit diagnostic surface that shows the exact contract/venue/timing/order payload that would be sent.
- Remove `EBS`-only assumptions from the ETF submit path and use approved instrument metadata (`ibkrPrimaryExchange`, exchange, conid) consistently.
- Parse and surface IBKR contract liquid/trading hours before live submit.

**Risks / dependencies**
- Depends on stable native contract-details access.
- Must not degrade current dry-run/live submission behavior for already-working instruments.
- Needs careful handling of timezones and venue-specific hours.

**Actionable checklist**
- Add a reusable execution-diagnostics helper for approved instrument + IBKR contract + order timing synthesis.
- Patch `scripts/submit-orders-at-open.js` to use approved metadata fields directly, not `exchange.includes('EBS')` heuristics.
- Add liquid-hours/trading-hours parsing and surface it in a pre-submit diagnostic command/result.
- Extend readiness/preflight to report per-instrument venue-open state, primary exchange, and mismatches.
- Save structured diagnostics to runtime artifacts for each live-preflight evaluation.
- Add unit/integration/regression tests for venue resolution, hours parsing, and UBSPX-specific order prep.

**Acceptance criteria**
- A pre-submit diagnostic output exists for executable rows and includes conid, symbol, exchange, primaryExchange, tradingHours, liquidHours, timing flags, and final live payload.
- `submit-orders-at-open.js` no longer hardcodes `EBS` for UBSPX-style instruments.
- Tests cover venue resolution and hours interpretation for UBSPX, EMUAA, and UBSSLI.

---

### Phase 179B — Failure-proof reconciliation and structured broker-order diagnostics
**Objectives**
- Persist enough structured data around each live attempt to diagnose failures without guessing.
- Unify immediate inactive/cancelled reconciliation behavior across all submission lanes.

**Risks / dependencies**
- Depends on Phase 179A contract/venue surface.
- Must preserve safety and not create noisy or misleading artifacts.

**Actionable checklist**
- Introduce structured broker-order diagnostic artifacts under `runtime/` for each transmitted attempt.
- Ensure both `portfolioExecution` and market-open submit paths write the same fields.
- Capture quote snapshot, contract details, payload, ack, broker error, reconciliation selector, and resulting row update.
- Add regression tests for native late-error enrichment plus artifact persistence.
- Verify that inactive/cancelled flows keep human-readable reason + machine-readable block classification.

**Acceptance criteria**
- Any immediate inactive/cancelled live attempt leaves a structured diagnostic artifact plus a rich trade-log row.
- Submission lanes produce equivalent reconciliation behavior in tests.

---

### Phase 179C — Exchange-hours reference integration and operator alerting foundation
**Objectives**
- Turn exchange-hours research into a usable local reference and warning surface.
- Alert early when an intended venue is closed or in auction-only / outside-liquid-hours state.

**Risks / dependencies**
- Public exchange pages differ in quality and change over time.
- IBKR contract hours should remain the primary truth where available.

**Actionable checklist**
- Normalize the captured exchange-hours reference into a structured local data file.
- Wire preflight to prefer IBKR liquid hours, then venue reference, then generic market fallback.
- Surface clear operator messages for "exchange closed", "outside liquid hours", and half-day/auction states.
- Add tests for source-priority and closed-exchange alert behavior.

**Acceptance criteria**
- Preflight/operator diagnostics can explain *why* a venue is considered closed or risky.
- Local reference files exist for common venues used in this repo plus a few common European ETF venues.

---

### Phase 179D — UBSPX alternatives research artifact and replacement decision support
**Objectives**
- Produce a decision-ready comparison of low-TER, non-synthetic, usual-venue S&P 500 ETF alternatives.
- Include operational confidence, not just fund attributes.

**Risks / dependencies**
- External market/fund metadata can change.
- Some listings may look attractive on paper but still require IBKR routing validation.

**Actionable checklist**
- Create a comparison artifact for UBSPX, iShares Core S&P 500 Acc, Vanguard S&P 500 Acc, Xtrackers S&P 500 4C, and relevant exclusions.
- Record TER, replication, distribution policy, common venues, likely IBKR friendliness, and operational notes.
- Add any repo-side metadata/update hooks needed for future replacement approval.

**Acceptance criteria**
- A clear artifact exists that can support a replacement decision without rereading external sources.
- Synthetic or otherwise unsuitable funds are explicitly excluded with reasons.

## Testing strategy
- Unit tests: hours parsing, venue resolution, payload synthesis, block classification.
- Integration tests: submit-path diagnostics generation, preflight instrument truth surface, runtime artifact persistence.
- Regression tests: immediate inactive late-error enrichment, UBSPX timing policy, existing working ETF paths.
- Suite gate: targeted phase tests first, then full repository test suite before phase completion.

## Safety constraints
- No additional live broker submission during this phase unless a later explicit, fresh approval is given after diagnostics are complete.
- Preserve explicit approval gates.
- Prefer diagnosis and dry-run verification over speculative live retries.

## Expected deliverables
- Code changes to readiness/preflight/submit surfaces
- new diagnostic and exchange-hours runtime artifacts
- automated tests
- operator-facing alternative ETF comparison artifact
