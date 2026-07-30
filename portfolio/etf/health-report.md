# Health Report: etf

## Management summary
- Generated at: 2026-07-29T20:00:12.159Z
- Current status: blocked (high)
- Management summary: Restore native IBKR connectivity before relying on executable live-state surfaces.
- Next step: Restore native IBKR connectivity before relying on executable live-state surfaces.
- Automatic fixes applied: 3
- Issues still needing attention: 2

## What matters now
- Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
- Next action: Restore native IBKR connectivity before relying on executable live-state surfaces.

## What the system already handled
- The system already handled 3 issue(s) automatically.
- Main detected symptom: IBKR gateway appears offline or unreachable on the native API socket.

## Health direction
- Health direction is worsening: 7 of the last 7 checks showed blocked or paused posture.

## Remaining status and reference details
- Generated-state issues: 0
- Delivery pending actions: 0
- Fill backfill review still open: 0
- Acknowledged backfilled fills: 1

## Recovery guidance

### ibkr_socket_dead
1. Confirm whether the native IBKR gateway is up and the API socket is reachable on 127.0.0.1:4001.
   - Command: `node scripts/check-interactive-brokers-readiness.js`
2. Restart the native IB gateway via the known-good launcher (uses the pinned install4j JRE — see TOOLS.md).
   - Command: `/home/ubuntu/ibgateway-native/start-ibc.sh`
3. Complete the IB Gateway login / second-factor approval on display :99 so the API port is exposed.
   - Manual step (no command)
4. Re-run readiness to confirm the API port is live and the gateway accepts orders again.
   - Command: `node scripts/check-interactive-brokers-readiness.js`