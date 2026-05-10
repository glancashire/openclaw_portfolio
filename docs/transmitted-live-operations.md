# Transmitted live execution operations

## Scope
This repo supports three distinct execution lanes:

1. `dry-run` — no broker write attempted.
2. `stage` — writable broker path allowed only for revocable **non-transmitted** staging.
3. `transmit-live` — explicitly opt-in real broker transmission path.

`transmit-live` is intentionally fail-closed. It must never happen accidentally through the staged writable path.

## Activation prerequisites
A transmitted live order should remain blocked unless all of the following are true:

- Portfolio status is `active`.
- Portfolio `Execution mode` is exactly `transmitted_live`.
- Broker account reference is resolved and not a placeholder.
- Interactive Brokers readiness is healthy.
- Holdings state is not unmatched, simulated, or stale.
- Strategy/risk blockers are clear.
- The specific order carries `userApproved: true`.
- The specific order carries `transmit: true`.
- The specific order carries the exact acknowledgement string:
  - `transmittedLiveAck: "I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER"`

If any prerequisite is missing, the repo should fail closed and return blockers rather than attempting a broker write.

## Recommended operator flow
1. Run `node scripts/trade.js preflight <portfolio-dir> --json` and require a truthful green readiness result before treating the lane as transmit-capable.
2. Run `node scripts/trade.js authority <portfolio-dir> --json` to confirm execution authority, runtime pause, live-arm state, and broker readiness posture.
3. Run `node scripts/trade.js config <portfolio-dir> --json` to inspect the effective redacted broker/runtime configuration.
4. Run `node scripts/trade.js delivery <portfolio-dir> --json` so delivery/reporting posture is not silently degraded while you operate the highest-risk lane.
5. Confirm the intended order is already approved and matches current strategy state.
6. Run the transmitted-live readiness check command for the specific order payload.
7. Verify the order JSON contains the explicit transmission intent and acknowledgement string.
8. Only then run the transmitted live submission path.
9. Immediately resync broker order state after submission and watch for fills, partial fills, rejects, or cancels.

## Verification command
Use this command before any transmitted-live attempt after the canonical diagnostics above:

```bash
node scripts/check-transmitted-live-readiness.js <portfolio-dir> '<order-json>'
```

Example order JSON shape:

```json
{
  "symbol": "EMUAA",
  "conid": "243939970",
  "action": "BUY",
  "orderType": "LMT",
  "limitPrice": 38.5,
  "quantity": 1,
  "currency": "EUR",
  "exchange": "SMART",
  "secType": "STK",
  "userApproved": true,
  "transmit": true,
  "transmittedLiveAck": "I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER"
}
```

## Safety notes
- Canonical diagnostic output should win over derived dashboards/summaries when they disagree.
- `trade preflight` is the decisive readiness answer for whether live transmission is currently safe.
- `trade authority` is the decisive authority answer for whether the portfolio/runtime posture could permit live action in principle.
- `stage` and `transmit-live` are not equivalent.
- A staged non-transmitted order is reversible scaffolding; a transmitted live order is a real broker write.
- Keep transmitted usage rare, deliberate, and auditable.
- After any transmitted attempt, update the trade log/history/dashboard via the normal reconciliation flow.
