# Roll-up D auto-remediation decision package

Last updated: 2026-05-30 UTC

## Objective
Decide whether any bounded self-heal actions should move from guidance into explicit operator-approved automation without widening autonomy unsafely.

## Current posture
The current self-heal system is intentionally conservative.

It already does the following safely:
- classify operational symptoms
- regenerate reporting/dashboard artifacts from existing state
- refresh summary/overview outputs
- record observability evidence
- surface operator commands and open issues

It intentionally does **not** do the following automatically:
- transmit trades
- approve baskets or orders
- bypass approval or market-hour gates
- force IBKR login / second-factor flows
- invent live data when subscriptions are missing
- clear active circuit breakers silently

## Recommendation
Keep the default posture conservative.

If promotion is approved at all, limit it to **reversible, idempotent, local-state actions** that do not change broker/account/execution state and do not bypass any approval boundary.

## Classification

### Safe candidate actions for operator-approved automation
These are good candidates because they are local, repeatable, and reconstructible from source/runtime state.

- regenerate dashboards and summary artifacts
- regenerate health reports and overview artifacts
- append structured observability/runtime evidence
- refresh delivery-status or operator-facing overview surfaces
- rerun read-only health/reporting synthesis commands

### Conditional candidates
These should only be promoted with explicit policy/guardrails because they may be operationally safe but can still create surprise or churn.

- relaunching the native IBKR wrapper when the socket is dead
- rerunning non-destructive diagnostic probes after a broker failure
- disabling a repeatedly failing cron job after a defined consecutive-error threshold
- invoking conservative runtime cleanup commands in approved retention windows

Required guardrails for any conditional candidate:
- explicit allowlist of permitted commands
- structured audit trail in runtime events
- cooldown / retry limits
- operator-visible notification of what happened and why
- no hidden escalation from degraded to live-ready posture

### Operator-only actions
These should remain outside automation unless the product posture changes materially.

- any trade transmission or order approval action
- any step that bypasses approval, market-hours, or safety blocks
- IBKR GUI login or second-factor completion
- clearing active circuit breakers
- changing live broker configuration or execution mode
- fabricating broker-readiness state from fallback assumptions
- any action that could alter holdings, cash, order state, or external account posture

## Approval boundary
Promotion beyond guidance should require all of the following:
- action is explicitly listed in the allowlist
- action is reversible or idempotent
- action stays on the local host and does not alter external account state
- action emits structured audit evidence
- action has a bounded retry/cooldown policy
- operator-facing surfaces show the action outcome clearly

## Recommended default decision
- Keep self-heal **advisory by default**.
- If any promotion is approved, promote only the safe candidate class first.
- Treat conditional candidates as a later follow-on phase with explicit approval and observability requirements.
- Keep operator-only actions out of scope.

## Implementation checklist if promotion is approved later
- [ ] Define the allowlisted action set
- [ ] Encode cooldown / retry / alerting policy per action
- [ ] Add structured runtime-event evidence for every auto-remediation attempt
- [ ] Add tests proving operator-only actions cannot cross the automation boundary
- [ ] Add operator-facing reporting that distinguishes advice from executed remediation
- [ ] Verify no broker/execution state can be changed by the promoted action set
