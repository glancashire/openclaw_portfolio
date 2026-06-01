# IBKR readiness classification plan — 2026-06-01

## Goal
Make broker readiness/reporting distinguish clearer market-data states so dashboard/operator surfaces stop collapsing everything into a vague "quote posture unclear" state.

## Scope
- Update `src/brokers/interactive-brokers/readiness.js`
- Keep current authentication/connectivity behavior intact
- Improve market-data posture detection and operator guidance
- Prefer minimal code changes with direct inspection verification

## Planned changes
1. Teach readiness detection to recognize more quote shapes:
   - delayed bid/ask fields when present
   - explicit subscription-error patterns in detail strings
   - close-only / stale-close-only posture
2. Return more precise `reason`, `marketDataMode`, `operatorState.code`, and guidance.
3. Preserve existing `fallbackRequired` safety posture for anything short of live/realtime.
4. Verify by reading the patched code and checking state-mapping logic consistency.

## Verification
- Direct file inspection of changed logic
- If shell approval becomes available later: run `node scripts/check-interactive-brokers-readiness.js`

## Risks
- Must not accidentally mark delayed or partial data as live-ready.
- Safety posture should remain conservative.
