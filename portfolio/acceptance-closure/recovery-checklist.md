# Recovery Checklist: acceptance-closure

## Incident Status
- Status: action_required
- Health: warning
- Broker health: degraded
- Execution posture: degraded_dry_run_only
- Delivery posture: needs_operator_attention
- Data freshness: stale
- Pending approvals: 0
- Recommended next step: Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked.

## Why This Incident Exists
- Execution is blocked because Portfolio still has open questions; trade execution must remain blocked.
- There is no active approval backlog.

## Incident Drivers
- Broker readiness is degraded, so broker-backed pricing/execution paths should be treated as unavailable until recovered.
- Data freshness is stale, so recommendations and execution paths should be treated as suspect until refreshed.
- 5 explicit blocker(s) are preventing a healthy operating posture.

## Active Blockers
1. [error] Portfolio still has open questions; trade execution must remain blocked.
2. [error] Holdings and pricing are still simulated.
3. [error] Missing concrete risk limit: Max single ETF allocation.
4. [error] Missing concrete risk limit: Max single issuer allocation.
5. [error] Missing concrete risk limit: Max cash drag after full deployment.

## Active Broker Blocks
1. No broker-derived trade blocks are currently recorded.

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
6. [high] Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture.
   - Action: Restore broker connectivity before relying on broker-backed pricing or live execution paths.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: broker_readiness
7. [medium] Dashboard/report freshness is stale relative to source state.
   - Action: Review report delivery readiness and clear the pending action.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: delivery_policy

## Verification Checks
- Broker health returns to healthy or the operator intentionally keeps the portfolio in draft-only mode.
- Dashboard, holdings, and summary inputs are refreshed until the stale posture clears.
- No approval backlog remains.
- Active blockers are cleared or explicitly documented as accepted constraints.

## Completion Criteria
- Blocking recovery items no longer appear in the operator queue.
- Portfolio health no longer depends on unresolved blocker conditions.
- The operator can explain the current posture and next operating step without cross-referencing multiple artifacts.

## Recent Signals
1. [warn] Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
2. [warn] Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
3. [warn] Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
4. [warn] Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
5. [warn] Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
