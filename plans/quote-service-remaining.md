# Quote service — remaining work (consolidated 2026-07-28)

Consolidated from three now-shipped plans:
- `2026-07-01-dashboard-return-metrics-plan.md` → **SHIPPED** (Phase 220): value-window labels + "vs net deposited" headline + unrealized-P/L separation live in `reportEmail.js`, `dashboardDigest.js`, `show-dashboard.js`.
- `quote-service-refactor-plan.md` → **SHIPPED** (Phase 220): `src/quotes/` service + `providers/{ibkrWebApi,ibkrTws,yahoo}` + normalized payload + dashboard provenance/age summary (`summarizeQuoteProvenance` in `dashboardGenerator.js`).
- `quote-service-next-phase.md` Phase A → **SHIPPED**: provider health/cooldown + TTL cache in `src/quotes/runtime.js` (`markProviderSuccess/Failure`, `isProviderCoolingDown`, `getCachedQuote/putCachedQuote`, `snapshotProviderHealth`); wired via `serviceRuntime.js`.

## Still pending

### Phase B — console provider-health block → **SHIPPED** (2026-07-28)
The generator now persists provider state into `dashboard.md` at generation time and the console renders it.
- `dashboardGenerator.js`: `summarizeProviderHealth()` (configured order + per-provider state, cooldown-aware) + `formatProviderHealthLines()` write a `## Quote Provider Health` section; snapshot captured right after `resolveHoldingQuotes`.
- `scripts/show-dashboard.js`: renders a `📡 Quote providers` block, flagging cooling-down (🧊) / failing (⚠️) providers; suppresses the empty placeholder.
- Test: `scripts/test-dashboard-provider-health-block.js` (order preservation, cooldown/expiry/idle states, placeholder). `scripts/test-quote-provider-health.js` still covers the runtime snapshot.

### Phase C — local daemon boundary
- Extract service internals to support a future long-lived process while keeping the in-process `resolveQuote/resolveQuotes` API stable.
- Keep broker writes separate from quote reads (existing safety posture).

## Verification
- `npm run verify` (verify-repo.js)
- regenerate + inspect real dashboard: `node scripts/show-dashboard.js etf`
- targeted: `test-quote-provider-health`, `test-quote-cache`, `test-dashboard-quote-provenance`
