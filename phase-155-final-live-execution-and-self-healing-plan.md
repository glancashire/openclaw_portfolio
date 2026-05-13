# Phase 155 — Final Live Execution, Portfolio Balancing, and Self-Healing Closure

## Goal
Close the gap between the current partially executed ETF portfolio and a safely operable system that can finish deployment, rebalance truthfully, monitor itself, and recover from common broker/runtime failures without silent drift or misleading operator surfaces.

This phase is about **actually becoming execution-ready**, not just adding another reporting surface.

## Current grounded state

As of 2026-05-13 11:02 UTC:
- IB Gateway is **not connected** right now; `trade.js status` cannot fetch open orders.
- Live-readiness preflight is **blocked** by four concrete blockers:
  1. `not_armed_for_market_open`
  2. `broker_unready`
  3. `no_executable_rows`
  4. `stale_approval`
- One ETF buy already **filled** successfully:
  - `LU0950668870` / EMUAA-like sleeve fill, broker order `9107`
- One ETF buy was **cancelled**:
  - `IE000XZSV718` / SPYL, broker order `9105`
- One ETF buy remains **approved but excluded** from execution:
  - `CH0032912732` / UBSSLI-like Swiss sleeve
  - blocked with `quote_unavailable`
- Delivery posture is still not fully closed because **fill notification backfill** remains unresolved.
- Dashboard/operator surfaces currently mix useful truth with some misleading emphasis:
  - top recommendation is delivery backfill
  - but the real portfolio-completion blockers are broker readiness, stale approval, and no executable rows

## What is still needed before the portfolio can actually finish balancing

### 1. Execution truth must become canonical
Right now the system still has too many overlapping representations of “approved”, “queued”, “retry”, “excluded”, and “ready”.

Needed:
- define one canonical execution-state model for each trade row:
  - proposal
  - approved
  - queued_first_handoff
  - queued_retry
  - executable_now
  - broker_submitted
  - partially_filled
  - filled
  - cancelled
  - blocked_retryable
  - blocked_hard
  - stale_needs_reapproval
- make dashboard, summary, readiness preflight, and `trade.js status` all derive from the same state classification
- stop showing rows as both “approved” and “ready for staging/review” when they are actually excluded from execution
- distinguish clearly between:
  - operator-approved but not executable
  - executable and armed
  - executable but broker-unready
  - submitted and awaiting reconciliation

### 2. Stale approvals need a real refresh workflow
The current approval is 52h old and correctly blocked, but the system does not yet provide a complete renewal loop.

Needed:
- add a first-class **reapprove stale rows** workflow
- preserve prior rationale and broker-block history while requiring fresh approval timestamp
- show stale-approval state prominently in dashboard and CLI
- ensure stale approvals are automatically excluded from live submission even if broker becomes healthy
- add operator command(s) and tests for:
  - stale approval detection
  - reapproval refresh
  - clearing stale blocker after reapproval

### 3. Open-order / broker-order reconciliation must be robust enough for live use
If IB Gateway disconnects, the system currently loses too much confidence about whether an order is open, cancelled, or filled.

Needed:
- robust open-order sync when broker reconnects
- explicit reconciliation pass that checks, in order:
  1. open orders
  2. completed orders
  3. executions/fills
  4. holdings delta
- preserve broker evidence fields in Markdown/runtime state:
  - broker status
  - broker reason / error code / message
  - execution timestamp
  - fill quantity / avg fill price
- add an idempotent recovery command like:
  - `trade reconcile-live portfolio/etf`
- ensure repeated reconciliation does not duplicate notes or mutate stable rows unnecessarily

### 4. Quote recovery and smart-limit construction need a recovery ladder
The last remaining buy is blocked because no quote was available during market-open execution.

Needed:
- treat `quote_unavailable` as a retryable execution blocker with a structured recovery ladder:
  1. retry broker quote immediately if broker reconnects during same session
  2. retry at next market-open window
  3. fall back to delayed data only if policy explicitly allows it for that instrument/venue
  4. if still impossible, mark row as `hard_blocked_market_data` and force operator decision
- make pricing-reference failure reasons more granular:
  - no quote returned
  - delayed only
  - no usable last/bid/ask/close field
  - entitlement missing
  - stale quote age too high
- ensure each reason maps to a specific next action and self-healing behavior

### 5. Rebalance proposal regeneration after partial fills/cancels
The current portfolio no longer matches the old entry plan because one row filled and one was cancelled.
The remaining plan should not simply replay the original queue.

Needed:
- after reconciliation, regenerate the portfolio deployment/rebalance plan from **current holdings + current cash + current target weights**
- explicitly decide whether the cancelled SPYL sleeve should:
  - be resubmitted as SPYL
  - be replaced by the current preferred S&P 500 sleeve
  - be resized due to the EMUAA fill and current cash state
- ensure the Swiss sleeve and global-equity sleeve are recalculated together, not treated as isolated leftovers
- require fresh approval for the regenerated plan
- persist that regenerated proposal to `trades.md`, `dashboard.md`, `summary.json`, and readiness surfaces

### 6. Dashboard priority logic needs to reflect execution reality
The dashboard currently puts delivery backfill first, which is true but not the most important portfolio-completion action.

Needed:
- split recommendations into distinct stacks:
  - **Execution blockers now**
  - **Portfolio completion actions**
  - **Operational cleanup / delivery**
- make the top recommendation prioritize portfolio completion when live execution is incomplete
- surface a dedicated section like:
  - `Path to balanced portfolio`
    - broker reconnect
    - reconcile live state
    - regenerate plan after partial execution
    - reapprove stale rows
    - arm next market-open window
    - submit executable rows
- show balance progress explicitly:
  - target deploy CHF
  - deployed CHF
  - remaining deployable CHF
  - intentional cash sleeve CHF
  - blocked deployable CHF

### 7. Self-healing needs to be real, bounded, and visible
Self-healing should not mean “silently keep trying forever.” It should mean safe automatic recovery from recoverable states.

Needed recoveries:
- if broker becomes reachable again:
  - auto-run a read-only reconciliation pass
  - refresh open orders / fills / holdings
  - re-evaluate excluded queued rows
- if a retryable quote/pricing block clears:
  - move row from blocked_retryable to executable_now
  - do **not** submit automatically unless still armed and approval is fresh
- if market window closes during recovery:
  - requeue for next window with preserved reason trail
- if fill notification backfill remains pending after reconciliation:
  - keep delivery-warning state, but do not let it eclipse harder execution blockers

Needed guardrails:
- retry budget / cooldowns
- no infinite rerun loops
- visible runtime events for each self-healing attempt
- clear escalation from retryable -> operator-required

### 8. Health monitoring needs explicit operational SLO-style checks
To finally trust this system, it needs a concise health model.

Needed health dimensions:
- **broker connectivity** — auth, reachability, account access
- **market data health** — realtime/delayed/unavailable per instrument
- **execution health** — queued, submitted, blocked, stale, reconciling
- **portfolio completion health** — percent deployed vs target, blocked cash, missing sleeves
- **artifact truth health** — dashboard/summary/report freshness vs source state
- **delivery health** — fill notification backfill / delivery pending state

Needed outputs:
- a single health snapshot command / artifact with severity per dimension
- heartbeat-safe checks that can run periodically without transmitting orders
- escalation rules for:
  - broker down during market-open window
  - stale approved rows
  - queued rows older than threshold
  - blocked rows whose blocker has changed
  - completed fills lacking notification/backfill closure

### 9. Cron / heartbeat automation should assist the operator, not replace approval
Needed automation:
- periodic read-only broker readiness check
- periodic reconciliation when a live order or recent fill exists
- queue-age watcher
- stale-approval watcher
- blocked-row retryability watcher
- delivery-backfill watcher
- automatic artifact refresh after each state change

But explicitly **not**:
- no automatic live order transmission without fresh approval + valid arming + healthy preflight
- no automatic reapproval
- no automatic instrument substitution without explicit operator policy

### 10. Operator commands likely still missing for real completion work
Likely commands/surfaces still needed:
- `trade reconcile-live <portfolio>`
- `trade refresh-approval <portfolio> <ticker>` or equivalent
- `trade regenerate-plan <portfolio> --from-current-holdings`
- `trade explain-blockers <portfolio>` with grouped retryable vs hard blockers
- `trade health <portfolio>` with the health dimensions above
- `trade self-heal <portfolio> --dry-run`

## Recommended implementation order

### Track A — restore truth and state transitions
1. Canonical trade-row execution classification
2. Stale approval refresh workflow
3. Robust reconciliation command and evidence persistence
4. Retryable-vs-hard blocker normalization

### Track B — make the portfolio balanceable again
5. Regenerate proposal from current live state after partial execution
6. Fresh approval loop for regenerated rows
7. Recompute executable rows and arm/submit workflow

### Track C — make the system operable without babysitting
8. Dashboard priority overhaul for portfolio completion
9. Health model + health command/artifact
10. Bounded self-healing loops and cron/heartbeat checks
11. Delivery/backfill cleanup demoted to operational cleanup tier unless it blocks execution truth

## Actionable checklist

### A. Live state recovery and execution truth
- [ ] Add canonical execution-state classification shared by readiness, dashboard, summary, and CLI.
- [ ] Add stale-approval refresh/reapprove workflow.
- [ ] Add idempotent live reconciliation command for orders/fills/holdings.
- [ ] Persist richer broker evidence on reconciled rows.
- [ ] Add regression tests for stale approval + reconciliation state transitions.

### B. Balance-from-current-state workflow
- [ ] Regenerate ETF deployment/rebalance plan from current holdings and current cash.
- [ ] Decide and encode policy for cancelled SPYL sleeve replacement/resubmission.
- [ ] Recompute Swiss sleeve executable sizing after current fill state.
- [ ] Require fresh operator approval for regenerated rows.
- [ ] Verify readiness can produce at least one executable approved row once broker is healthy.

### C. Dashboard / summary / cockpit truth
- [ ] Split recommendation priority into execution blockers vs operational cleanup.
- [ ] Add explicit “Path to balanced portfolio” section.
- [ ] Add deployment progress metrics and blocked-cash metrics.
- [ ] Show stale approvals and non-executable approved rows more prominently.
- [ ] Keep delivery backfill visible without letting it hide harder execution blockers.

### D. Health monitoring and self-healing
- [ ] Add health model across broker/data/execution/completion/artifact/delivery dimensions.
- [ ] Add health command/artifact and regression coverage.
- [ ] Add bounded self-heal dry-run path for retryable broker/quote recovery.
- [ ] Add cron/heartbeat-safe checks for broker, queue age, stale approvals, blocked rows, and fill backfill.
- [ ] Add escalation rules and event evidence for every self-healing attempt.

## Verification gates
- `node scripts/check-live-readiness-preflight.js portfolio/etf --json`
- `node scripts/trade.js status portfolio/etf`
- targeted reconciliation tests
- targeted stale-approval workflow tests
- targeted rebalance-from-current-state tests
- targeted dashboard/summary priority tests
- targeted health/self-healing tests

## Definition of done
This phase is done when all of the following are true:
1. The system can reconnect to IBKR and reconcile open/completed/filled state without ambiguity.
2. The current portfolio can be re-planned from actual holdings/cash after partial execution.
3. Fresh approval can be collected and enforced for regenerated executable rows.
4. Readiness can truthfully distinguish executable vs excluded vs stale rows.
5. Dashboard/cockpit surfaces clearly prioritize the actions required to finish balancing.
6. Retryable broker/quote failures have bounded, visible self-healing behavior.
7. Delivery backfill remains tracked, but no longer obscures execution-critical next steps.
8