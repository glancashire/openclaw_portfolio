# Phase 123 — IBKR Gateway Recovery and Execution Enablement Plan

_Last updated: 2026-05-11 06:13 UTC_

## Goal

Restore a stable local Interactive Brokers Gateway/API listener, explain why it goes down, align repo/runtime configuration with the actual listener, then work through the remaining execution blockers until the ETF portfolio is genuinely executable under the existing safety model.

## Current observed truth

- OpenClaw itself is running.
- IBKR Client Portal Gateway HTTP process is running on port `5000`.
- The local IB API socket expected for order execution is **not** listening on either `4001` or `4000`.
- Repo broker config currently points to native host `127.0.0.1:4001` with `readonly: true`.
- `Jts/jts.ini` currently shows `LocalServerPort=4000` and `ReadOnlyApi=false`.
- Portfolio execution mode is `require_confirmation`.
- Live execution is not armed.
- `portfolio/etf/trades.md` has only proposed rows and no approved executable rows.

## Root-cause hypothesis

The immediate outage is not that OpenClaw Gateway is down; it is that the **IBKR local API listener is absent**. Current evidence suggests a combination of:

1. **2FA-gated native startup that does not complete into a stable logged-in session**
   - A fresh 2026-05-11 startup reached `Second Factor Authentication` and then exited with status `143` after the 2FA dialog closed, before any native API socket bound.
   - This means the practical blocker is not a low-level crash; it is failure to survive or complete the authentication flow into a resident post-login session.

2. **Session shutdown / non-persistent native gateway runtime even after successful login**
   - Prior IBC logs show a successful login/config flow followed later by a clean session exit.
   - That means the system had at least one working launch path, but it did not remain available as a durable execution service.

3. **Port-truth mismatch**
   - Repo config expects `4001`.
   - `jts.ini` currently advertises `LocalServerPort=4000`.
   - Checks against both ports currently fail, but this mismatch makes diagnostics and readiness checks less trustworthy.

3. **Possibly split transport assumptions**
   - Port `5000` (Client Portal HTTP Gateway) is up.
   - Native socket transport for execution is down.
   - The project intentionally prefers native socket transport for active execution, so HTTP gateway availability does not satisfy execution readiness.

4. **Service hardening gap**
   - The native startup path appears recoverable but not yet hardened into a continuously reliable, monitored local API service.

## Desired end state

A real execution-ready posture means all of the following are true:

1. Native IBKR API listener is up on the intended port.
2. Repo config matches the real port and transport.
3. Broker readiness reports healthy, not `native_error` or `delayed_data_only`.
4. Writable posture is deliberately enabled only after validation.
5. Portfolio execution mode is switched deliberately if live transmission is intended.
6. Live execution is armed for the intended market-open window.
7. Selected trade rows are explicitly approved and executable.
8. Canonical preflight returns green or at least only expected timing warnings.

## Work plan

### A. Diagnose and document why the gateway goes down
- Inspect startup and shutdown logs for the last successful native IBC run.
- Inspect the latest failed startup showing 2FA dialog closure followed by exit status `143`.
- Determine whether shutdown was caused by:
  - scheduled end-of-session behavior
  - manual termination
  - 2FA/login timeout or post-2FA termination behavior
  - launcher/runtime drift
  - API-only/config path mismatch
- Record the exact failure mode in repo docs and learnings.

### B. Reproduce and restore the native startup path
- Validate the pinned Java runtime still exists and matches the required version/vendor intent.
- Keep the launcher validation tolerant enough to accept the known-good bundled Zulu runtime representation.
- Validate `start-ibc.sh` still targets the intended staged install and settings directory.
- Launch the native gateway path and observe:
  - whether login completes
  - whether API socket binds
  - which port actually binds
  - whether the process remains resident
- Capture logs and port evidence.

### C. Resolve port/config truth
- If the listener binds to `4000`, either:
  - update repo secret/runtime config to use `4000`, or
  - update JTS/IBC config so the stable listener is `4001`.
- Choose one canonical port and make all checks/tools consistent with it.
- Re-run readiness and CLI account-summary against the canonical port.

### D. Harden runtime persistence
- If the listener comes up but later exits, identify what terminates it.
- Add the smallest safe hardening step needed so the local API remains available long enough for operator workflows.
- Confirm the restart/recovery path is documented and reproducible.

### E. Clear execution blockers in order
1. broker connectivity healthy
2. canonical port/config aligned
3. deliberate writable enablement decision
4. deliberate execution-mode decision
5. live arm set for intended window
6. trade-row approval and executable-row confirmation
7. final preflight / authority / config verification

## Execution blocker checklist

### Infrastructure / broker
- [ ] Identify exact reason the native IBKR runtime exits or fails to expose the socket
- [ ] Restore native socket listener on a canonical port
- [ ] Align repo config with canonical port
- [ ] Re-run readiness and account-summary successfully

### Safety / authority posture
- [ ] Decide whether to keep `readonly` or deliberately switch to writable
- [ ] If writable is intended, update config only after broker readiness is proven
- [ ] Decide whether to keep `require_confirmation` or switch to `transmitted_live`
- [ ] Arm live execution for the intended market-open window

### Trade state
- [ ] Review proposed rows for staleness and dedupe
- [ ] Approve the intended trade rows explicitly
- [ ] Confirm rows become executable under the current workflow

### Final verification
- [ ] `node scripts/trade.js preflight portfolio/etf --json`
- [ ] `node scripts/trade.js authority portfolio/etf --json`
- [ ] `node scripts/trade.js config portfolio/etf --json`
- [ ] `node scripts/trade.js status portfolio/etf`
- [ ] broker CLI account summary / open orders on canonical port

## Verification commands

### Current truth
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js config portfolio/etf --json`
- `ss -ltnp | egrep '(:4000|:4001|:4002|:5000|:7496|:7497)'`

### Native recovery
- `bash /home/ubuntu/ibgateway-native/start-ibc.sh`
- `python3 skills/ibkr/scripts/ibkr_cli.py account-summary --host 127.0.0.1 --port <canonical-port> --readonly --json`

### Execution enablement
- `node scripts/approve-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`

## Risks / guardrails

- Do not widen execution permissions before broker readiness is genuinely healthy.
- Do not assume HTTP gateway on `5000` means native execution readiness.
- Do not silently change to live transmission without explicit operator intent.
- Keep all trade writes approval-gated and auditable.

## Done criteria

This phase is complete when:
- we can clearly explain why the IBKR gateway/API goes down or disappears
- the local native API listener is stably restored on a canonical port
- repo config and runtime truth match that port
- canonical readiness commands reflect healthy broker state
- remaining execution blockers are worked down in order with evidence
