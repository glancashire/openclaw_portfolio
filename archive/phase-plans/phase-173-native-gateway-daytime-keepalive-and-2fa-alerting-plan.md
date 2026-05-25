# Phase 173 — Native gateway daytime keepalive and 2FA alerting plan

## Goal

Keep the native IBKR gateway alive during daytime by checking readiness on a 24h cadence, restarting the native gateway when it has gone down, and notifying the operator by mail when the gateway is waiting on login/2FA approval without auto-retrying unless explicitly asked.

## Current reality

The native IBKR path is working again when the gateway is fully authenticated, but it can still drop back into a waiting state where:

- the wrapper is running
- the IBC command port is reachable
- the actual IBKR API socket is not yet open
- operator approval is still needed for 2FA/login

That state should be handled explicitly and conservatively.

## Scope

### In scope

- add a repo-side keepalive script for the native gateway
- detect healthy / down / waiting-on-2FA states from readiness
- restart the native gateway during daytime when it is down
- send one operator email if it is waiting on 2FA and do not auto-retry again unless asked
- persist minimal local state for last restart / last ready / last 2FA mail
- add a focused test for the keepalive behavior
- install a daytime cron job to run the keepalive
- verify the cron/job shape and runtime behavior

### Out of scope

- changing IBKR login flow or 2FA policy
- bypassing manual approval
- retrying automatically after the 2FA email without explicit operator instruction
- live trade execution changes

## Implementation steps

1. Add the native gateway keepalive script.
2. Add a focused test for readiness classification, restart-on-down, and one-shot 2FA mail behavior.
3. Add a daytime cron job for the keepalive.
4. Re-run the focused test and the relevant readiness checks.
5. Validate the keepalive job definition and schedule.
6. Commit the plan, implementation, and verification artifacts in tight scope.

## Verification gates

- `node scripts/test-ibkr-native-keepalive.js`
- `node scripts/check-interactive-brokers-readiness.js`
- `node scripts/health-monitor-cron.js payload portfolio/etf --expr '0 9-18 * * *' --tz UTC --delivery none`

## Success criteria

- daytime cron exists for native gateway keepalive
- down state restarts the native gateway
- waiting-on-2FA state sends one email and stops retrying
- healthy state is a no-op
- readiness remains green when the native gateway is already up
