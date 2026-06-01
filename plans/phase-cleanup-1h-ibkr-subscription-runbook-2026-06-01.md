# Phase Cleanup-1H — IBKR market-data subscription posture (operator-gated)

**Date:** 2026-06-01 22:45 UTC
**Tranche:** 3 (operator-gated)

## Objectives

`marketDataMode=unknown` keeps live submission blocked. The probable root cause is operator-side: market-data subscriptions / data farms on the IBKR side. This phase **does not auto-fix**; it documents what we know and how to investigate from the operator side, so when Graham next attends to the IBKR client portal, the path forward is clear.

## What we know (current truth)

- Socket / auth / read paths are all healthy (positions, accounting all fine).
- `fetchMarketSnapshot` returns objects that contain neither live (84/86/31) nor delayed (88/87) fields.
- This is consistent with: (a) market-data subscription not active for the requested instruments / exchanges, (b) data-farm (e.g. `ushmds2a`, `eufarm`) not connected, or (c) account is in a state where snapshot requests are rejected without an explicit error.
- Because the API does not raise an explicit "subscription required" error here (which would otherwise hit the existing `subscription_missing` posture), we can't auto-classify and route to `subscription_missing`.

## What can't be done autonomously

- Logging in to the IBKR client portal to inspect / activate subscriptions.
- Restarting the gateway in a way that forces fresh data-farm subscription attempts.
- Switching account types or signing additional MDS/exchange agreements.

## What we can do

1. Add a `step 5+` to the IBKR recovery runbook with explicit pointers:
   - How to inspect data-farm state from inside the gateway UI.
   - The two-line `python3 -c` cross-check using `ib_insync` to differentiate "no subscription" from "no data right now".
   - The IBKR client-portal URL pattern to verify subscriptions on U25624150.
2. Document the link between the new `posture_detection_timeout` readiness reason and this runbook step.

## Risks / dependencies

- None. Doc-only change.

## Actionable checklist

- [ ] Append a `## Step 6 — Quote posture remains unknown after auth/read are healthy` section to `docs/operations/ibkr-recovery.md`.
- [ ] Cross-link from `STATUS.md`'s `What is degraded` section.
- [ ] Add a small assertion in `scripts/test-cron-delivery-posture.js` companion or a separate `scripts/test-ibkr-recovery-runbook.js` that the runbook contains a "Step 6" / "subscription posture" section, so future doc edits don't accidentally lose it.

## Acceptance criteria

- Runbook has a Step 6 section with concrete operator instructions.
- STATUS.md's "What is degraded" entry points at the runbook step.
- Runbook structure regression test passes.
