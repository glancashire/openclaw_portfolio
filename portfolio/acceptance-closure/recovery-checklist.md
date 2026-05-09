# Recovery Checklist: acceptance-closure

## Incident Status
- Status: action_required
- Health: warning
- Broker health: degraded
- Execution posture: degraded_dry_run_only
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 0
- Recommended next step: Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked.

## Why This Incident Exists
- Execution is blocked because Portfolio still has open questions; trade execution must remain blocked.
- There is no active approval backlog.

## Incident Drivers
- Broker readiness is degraded, so broker-backed pricing/execution paths should be treated as unavailable until recovered.
- 5 explicit blocker(s) are preventing a healthy operating posture.

## Active Blockers
1. [error] Portfolio still has open questions; trade execution must remain blocked.
2. [error] Holdings and pricing are still simulated.
3. [error] Missing concrete risk limit: Max single ETF allocation.
4. [error] Missing concrete risk limit: Max single issuer allocation.
5. [error] Missing concrete risk limit: Max cash drag after full deployment.

## Action Checklist
1. [high] Holdings and pricing are still simulated.
   - Action: Resolve the blocking condition before proceeding.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: safety_controls
2. [high] Missing concrete risk limit: Max cash drag after full deployment.
   - Action: Resolve the blocking condition before proceeding.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: safety_controls
3. [high] Missing concrete risk limit: Max single ETF allocation.
   - Action: Resolve the blocking condition before proceeding.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: safety_controls
4. [high] Missing concrete risk limit: Max single issuer allocation.
   - Action: Resolve the blocking condition before proceeding.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: safety_controls
5. [high] Portfolio still has open questions; trade execution must remain blocked.
   - Action: Resolve the blocking condition before proceeding.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: safety_controls
6. [high] Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
   - Action: Restore broker connectivity before relying on broker-backed pricing or live execution paths.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: broker_readiness

## Verification Checks
- Broker health returns to healthy or the operator intentionally keeps the portfolio in draft-only mode.
- Freshness posture remains current.
- No approval backlog remains.
- Active blockers are cleared or explicitly documented as accepted constraints.

## Completion Criteria
- Blocking recovery items no longer appear in the operator queue.
- Portfolio health no longer depends on unresolved blocker conditions.
- The operator can explain the current posture and next operating step without cross-referencing multiple artifacts.

## Recent Signals
1. [warn] Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
2. [warn] Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
