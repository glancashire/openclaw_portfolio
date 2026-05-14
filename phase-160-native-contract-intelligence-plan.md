# Phase 160 — Native contract intelligence

## Goal
Add a native-contract intelligence layer that preserves validated Interactive Brokers contract metadata from native `contractDetails`, makes contract resolution results reusable across resolution paths, and exposes enough structured detail for operator review without reviving browser-session dependence.

## Why this phase
The roadmap expansion explicitly calls for cache/normalization of native contract details and for preferring validated native metadata over browser-session heuristics. The repo already has multiple native-contract probes plus partial normalization, but resolution surfaces still flatten important fields and do not yet provide a durable, structured contract-intelligence shape.

## Scope
- Define a normalized native contract intelligence shape that preserves:
  - `conid`
  - `symbol`
  - `localSymbol`
  - `primaryExch`
  - `exchange`
  - `currency`
  - `secType`
  - `isin` when present
  - a stable `venueKey` / identity-friendly fields for reuse
- Reuse that shape in native contract detail normalization and ETF instrument search normalization.
- Add a contract-intelligence selection helper for conid resolution scripts so best-match decisions are more explicit and auditable.
- Add a lightweight cache artifact or reusable result surface only if it can stay read-only and deterministic in tests.
- Add focused regression tests for normalization and selection behavior.

## Non-goals
- No browser-session / Client Portal fallback resurrection.
- No hidden broker-state mutation.
- No live order-path behavior change beyond safer contract metadata reuse.
- No speculative multi-venue auto-submission logic.

## Design notes
- Keep native contract intelligence as a pure normalization/helper layer first.
- Prefer deterministic ranking with explicit tie-breakers over ad hoc “first result wins”.
- If a cache artifact is added, keep it as a transparent JSON output or optional file write, not an implicit mutable dependency.
- Preserve existing script compatibility where practical.

## Verification plan
- Existing focused tests for native contract normalization continue to pass.
- Add tests covering:
  - native intelligence normalization preserving local symbol / primary exchange / venue key
  - ETF search normalization using the same shape
  - best-match selection preferring exact symbol + currency + venue-aware candidates over weaker matches
- Run the focused suite and iterate until green.
