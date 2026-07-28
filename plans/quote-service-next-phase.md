# Quote service next-phase plan

## Goal
Increase quote-service reliability with provider health/caching, then surface provider health in dashboard/reporting and prepare for a local quote daemon boundary.

## Phase A — provider health/cache
- Add provider-state cache module with:
  - lastSuccessAt
  - lastFailureAt
  - consecutiveFailures
  - lastError
  - cooldownUntil
- Quote resolution should:
  - skip providers in cooldown unless forced
  - mark success/failure after each attempt
  - optionally cache positive quotes briefly by key
- Add bounded TTL cache for quote results:
  - live/realtime: short TTL (e.g. 15s)
  - last_close: longer TTL (e.g. 10m)

## Phase B — dashboard provider health
- Add dashboard summary block for provider health:
  - configured order
  - provider state
  - last success/failure
  - cooldown status
- Add quote provenance summary line already present to reference provider health block.

## Phase C — local daemon preparation
- Extract service internals to support a future long-lived process.
- Keep current in-process API stable.

## Verification
- test provider cooldown skip
- test quote cache hit behavior
- test dashboard provider health rendering
- regenerate real dashboard and inspect
