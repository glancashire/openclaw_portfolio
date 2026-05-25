# Phase 101 — Full Project Audit and Improvement Plan

_Last updated: 2026-05-10 11:45 UTC_

## Objective

Audit the entire portfolio-manager project from the perspectives of:
- senior software engineering and architecture
- quality assurance and testing
- user interface / UX
- OpenClaw power-user operations and Markdown/config ergonomics
- investor usability, automation, transparency, and control
- safety / execution guardrails

Then consolidate the findings into a practical improvement plan that can be implemented in phases.

---

## Executive summary

This project has grown into a strong prototype/operator tool with unusually good transparency, explicit Markdown state, and strong reporting/overview surfaces. The architecture is already better than many internal tools at the same maturity stage.

That said, it now shows the classic symptoms of a fast-moving phase-driven build:
- command/script surface sprawl
- legacy `lib/` vs newer `src/` overlap
- many generated/runtime artifacts living beside hand-maintained project assets
- no single canonical test runner
- partial mismatch between portfolio control state, broker readiness, and operator expectations
- too much operational knowledge encoded in docs/plans rather than narrow reusable abstractions

The good news: this is fixable without changing the core philosophy.

The strongest direction is **not** to add more execution power first.
The strongest direction is to make the current system:
1. more deterministic,
2. more auditable,
3. easier to operate,
4. harder to misuse,
5. simpler to verify before Monday-style live actions.

---

## Critical immediate finding: Monday market-open purchases are NOT ready yet

I verified the current live-execution posture directly.

### Evidence
- `node scripts/check-transmitted-live-readiness.js ...` returned blockers:
  - `approval_required`: execution mode is `require_confirmation`, not `transmitted_live`
  - `broker_unready`: Interactive Brokers readiness is not healthy
- `node scripts/check-interactive-brokers-readiness.js` returned:
  - `authenticated: false`
  - `reachable: false`
  - `reason: native_error`
- `portfolio/etf/dashboard.md` currently says:
  - broker health is not ready
  - execution posture is `degraded_dry_run_only`
  - pending approvals: `7`
- `portfolio/etf/trades.md` currently shows proposed rows and no approved/submitted live ETF rows for the real portfolio state surfaced in the dashboard.

### Conclusion
At this moment, the system is **not in place to execute purchases at Monday market open**.

### The blocking gaps are operational, not just code-level
1. Broker connectivity/readiness is unhealthy.
2. Execution mode is still confirmation-gated.
3. The portfolio trade log/dashboard state does **not** reflect the claimed “approved first orders” in the active ETF portfolio.
4. There is no final preflight bundle yet that gives one decisive green/red answer for “safe to transmit at next market open”.

---

## What the project is already doing well

### Architecture strengths
- Clear domain separation in `src/`:
  - `analysis/`
  - `brokers/`
  - `execution/`
  - `reporting/`
  - `validation/`
  - `workflows/`
- Markdown-first state keeps control transparent.
- Safety gates and dry-run posture are explicit.
- Reporting/overview artifacts are unusually strong for an MVP.
- The project already leans toward auditable, explicit operator workflows rather than “magic automation”.

### Product strengths
- Good visibility into pending actions, blockers, and generated artifacts.
- Strong operator-review surface compared with most robo-advisor-like systems.
- Good investor control posture: readable inputs, explicit approvals, generated summaries.
- Good foundation for an OpenClaw-native control UI.

---

## Engineering and architecture audit

## 1. Hard-coded and problematic patterns

### Findings
1. **Obsolete entrypoints exist**
   - `scripts/execute-trades.js` is intentionally obsolete and only exits with an error.
   - That is acceptable temporarily, but it is a maintenance smell.

2. **Global mutable process environment behavior exists**
   - `src/brokers/interactive-brokers/client.js` mutates `NODE_TLS_REJECT_UNAUTHORIZED` during runtime.
   - This is risky because it changes global process behavior and can have side effects outside the call site.

3. **Config defaults are scattered**
   - IBKR defaults are split across env access, config helpers, scripts, and docs.
   - There is no single typed “effective configuration” diagnostic surface.

4. **Script sprawl**
   - The repo has many `scripts/test-*`, `scripts/debug-*`, `scripts/check-*`, and execution scripts.
   - Useful for velocity, but now difficult to reason about.

5. **Legacy overlap between `lib/` and `src/`**
   - `lib/` appears to hold older utilities while newer work lives in `src/`.
   - This creates uncertainty about the canonical implementation path.

6. **Generated artifacts versioned beside source**
   - `runtime/overview/*`, `portfolio/*/summary.*`, and related generated surfaces are often dirty.
   - This makes it harder to distinguish source changes from output refreshes.

7. **No unified test command**
   - `npm test` is missing.
   - This is a real operational and QA gap.

### Fix recommendations
- Remove or archive obsolete entrypoints after replacing them with a canonical command surface.
- Stop mutating global TLS env state; inject TLS behavior at request/client construction boundaries only.
- Create a single config module and an `effective-config` diagnostic CLI.
- Consolidate scripts under stable categories with one canonical trade/report/check command tree.
- Either migrate `lib/` into `src/legacy/` or merge remaining live code into `src/` and delete dead copies.
- Decide which generated artifacts are source-controlled and which are runtime-only; codify that in `.gitignore` and docs.
- Add `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:smoke`, `npm run lint`, `npm run verify`.

---

## 2. Dead code / removal candidates

## Likely removal or consolidation candidates

### High-confidence candidates
- `scripts/execute-trades.js`
  - Replace with a compatibility shim or remove after documenting the canonical replacement.
- ad-hoc debug scripts in `scripts/debug-native-*`
  - keep only if they are used as repeatable diagnostics
  - otherwise move into `scripts/debug/archive/` or `docs/research/`
- any duplicate capability that exists both in `lib/` and `src/`
  - especially proposal generation, state helpers, and notification formatting if duplicated in behavior

### Likely consolidation candidates
- readiness checks:
  - `check-interactive-brokers-readiness.js`
  - `check-transmitted-live-readiness.js`
  - related policy checks
  - these should become one layered preflight system
- trade execution surface:
  - `trade.js`
  - `submit-orders-at-open.js`
  - `stage-portfolio-order.js`
  - `approve-portfolio-trade.js`
  - `reject-portfolio-trade.js`
  - `cancel-portfolio-order.js`
  - `resync-portfolio-orders.js`
  - these should feel like one coherent CLI/API surface

### Recommended action
Create a formal “script rationalization” phase:
- mark each script as `canonical`, `compat`, `debug`, `archive`, or `remove`
- ensure every remaining script has:
  - clear usage/help
  - stable output mode
  - machine-readable JSON option if operationally relevant

---

## 3. Architecture improvements

## Recommended improvements

### A. Introduce a true application service layer
The repo has good modules, but a lot of behavior still lives in script orchestration.

Add explicit services such as:
- `TradeApprovalService`
- `ExecutionPreflightService`
- `MarketOpenExecutionService`
- `PortfolioStatusService`
- `OperatorDigestService`

This makes behavior easier to test without shelling through scripts.

### B. Add a canonical domain model for order lifecycle
Today lifecycle logic appears spread across rows, scripts, runtime events, and dashboard/reporting summaries.

Introduce a normalized model with explicit states such as:
- proposed
- approved
- staged_not_transmitted
- ready_for_window
- submitted
- partially_filled
- filled
- cancelled
- rejected
- blocked
- failed
- requires_operator_review

Use one central mapping for:
- trade rows
- runtime events
- operator queue items
- dashboard/report labels

### C. Separate source-of-truth state from derived artifacts
Clearly distinguish:
- source state: Markdown + minimal runtime state
- derived state: dashboards, summaries, overview HTML/JSON/MD
- ephemeral diagnostics: event streams, debug output

This will reduce confusion and dirty-tree churn.

### D. Add a “preflight contract” for live actions
There should be one reusable preflight result object that every live-action path consumes.

It should answer:
- is trading allowed at all?
- is this portfolio allowed to trade now?
- are these specific rows executable?
- what exact blockers remain?
- what is safe to do automatically?

---

## QA and testing audit

## 1. Current QA strengths
- Many focused executable tests exist.
- Good contract-hardening pattern in later phases.
- Safety and reporting logic already have targeted verification.

## 2. QA gaps
1. No single `npm test` or test matrix entrypoint.
2. Test layout is split between `scripts/test-*` and `tests/*`.
3. There is no visible coverage reporting.
4. Too many tests appear custom-script style rather than a standard test framework.
5. Limited distinction between:
   - unit
   - integration
   - broker-dependent
   - artifact/contract
   - end-to-end
6. No explicit CI-quality gate summary in the repo surface.

## QA improvement recommendations

### Immediate
- Add a canonical `npm test`.
- Add grouped scripts:
  - `test:unit`
  - `test:integration`
  - `test:contracts`
  - `test:broker-mocked`
  - `test:smoke`
  - `verify`
- Add a lightweight coverage tool and baseline threshold.

### Structural
- Move toward a standard test runner for new tests.
- Keep existing script tests, but gradually wrap them under one harness.
- Add fixture directories for:
  - portfolio markdown
  - holdings snapshots
  - broker readiness states
  - order lifecycle scenarios
  - runtime event streams

### High-value missing tests
- end-to-end preflight for Monday market-open readiness
- mismatch test: user claims orders approved but trade log/dashboard disagree
- idempotent cron/job execution
- stale approval expiration
- exchange holiday and half-day handling
- FX conversion reliability and missing-entitlement fallbacks
- notification delivery failure and retry behavior
- generated artifact drift detection
- approval replay / duplicate-submit prevention under restart conditions

---

## UI / UX audit

## Strengths
- Strong transparency
- Good operator summaries
- Clear pending-action concept
- Markdown-first is excellent for auditability

## UX gaps
1. Too many operator concepts are still “document-native” rather than interaction-native.
2. Trade approval is likely too row-oriented for a human investor.
3. The system exposes implementation detail instead of investor intent in some places.
4. It lacks a single “What do I need to do now?” screen and a single “What happened since last time?” screen as first-class control surfaces.
5. Approval and execution readiness are not yet reduced to one decisive preflight summary.

## UX recommendations

### Investor-facing interaction improvements
- Introduce a guided portfolio strategy editor around user intent, not markdown fields.
  - goals
  - risk tolerance
  - CHF preference
  - deployment speed
  - allowed ETF universe
  - trading constraints
  - cash reserve preference
- Generate Markdown from that guided input rather than expecting direct Markdown edits for normal use.

### Approval UX improvements
- Present proposed orders as a batch decision card:
  - why this batch exists
  - what changed since last batch
  - total cash deployed
  - estimated fees/slippage
  - resulting allocation after execution
  - what remains in cash
- Require approval at the batch level, with optional per-row drilldown.

### Status UX improvements
Create first-class views for:
- **Today**: what needs action now
- **Execution window**: what will be sent when markets open
- **Portfolio state**: current allocation, drift, recent changes
- **Recent activity**: proposals, approvals, submissions, fills, failures
- **System health**: broker, market data, reports, automation, alerts

### Messaging UX improvements
When using OpenClaw/chat interaction, messages should be normalized into a pattern:
1. state
2. decision needed
3. consequence
4. safe action buttons/commands

Example:
- “3 ETF buy orders are ready for Monday open. Total CHF 3,533.30. Broker connectivity is unhealthy, so nothing will transmit unless connectivity is restored and you confirm execution mode. Review batch / enable trading / postpone.”

---

## OpenClaw / Claude / skills / Markdown-config audit

## Markdown and configuration improvements

### Current strengths
- Good human-readable control files
- Clear guardrails in `playbook.md`
- Sensible note in `config/openclaw.md`

### Improvements
1. Add a canonical repo-local operations guide:
   - what commands are canonical
   - what files are source vs derived
   - what “ready for live execution” means exactly
   - how cron/jobs should be configured

2. Improve Markdown contracts with machine-readable front matter or explicit metadata blocks where useful:
   - schemaVersion
   - lastValidatedAt
   - generatedFrom
   - executionPolicyVersion

3. Add stronger separation between:
   - investor intent config
   - operator policy config
   - broker integration config
   - reporting/delivery config

4. Add OpenClaw-oriented config documentation for:
   - heartbeats vs cron
   - what can be proactive vs approval-gated
   - which messages can leave the system automatically

5. Add a dedicated `system-policy.md` or equivalent repo-local operational contract:
   - allowed instruction sources
   - approved channels
   - approval semantics
   - safe automation boundaries

### OpenClaw power-user recommendations
- Add a hygiene/status cron job that produces a short operator digest:
  - broker readiness
  - pending approvals
  - stale data
  - failed jobs
  - recent fills
  - next scheduled reports
- Add a weekly review digest:
  - portfolio drift
  - performance summary
  - unresolved questions
  - policy anomalies
- Add “wake only on actionable change” logic so the system is informative without being noisy.

---

## Investor / portfolio-management product audit

## What would make this more compelling vs alternatives

Potential competition includes:
- robo-advisors (simple but opaque and low-control)
- broker recurring-investment tools (cheap but narrow)
- portfolio trackers with rebalancing suggestions (informative but not operational)
- advisor dashboards (powerful but expensive or overbuilt)

### This project’s real opportunity
A low-cost, ETF-only, transparent “operator-assisted autopilot” for thoughtful investors who want:
- full control
- full auditability
- low fees
- no black box
- simple approvals
- clear status
- safe automation

### Highest-value product additions
1. **Goal-driven portfolio builder**
   - not “edit markdown” first
   - ask what the investor wants and generate the control files

2. **Batch proposal and approval workflow**
   - investor approves a coherent action set, not disconnected rows

3. **Cash deployment planner**
   - “deploy new cash gradually over N windows”
   - “keep minimum CHF reserve”
   - “avoid buying on extreme up days”

4. **Recurring contribution automation**
   - investor says “add CHF 1,000 monthly”
   - system proposes the lowest-turnover allocation path

5. **Explainability layer**
   - “why this ETF”
   - “why this size”
   - “why now”
   - “what changed since last time”

6. **Trustworthy execution notifications**
   - proposal created
   - batch approved
   - queued for next market window
   - submitted
   - filled / partially filled / cancelled / blocked
   - holdings/report/dashboard refreshed

7. **Portfolio health feed**
   - one simple ongoing digest rather than requiring the user to inspect many files

8. **Tax / cost / FX awareness**
   - estimated FX cost
   - spread sensitivity
   - exchange selection logic
   - fee-aware order sizing

9. **Holiday-aware scheduling**
   - not just market open by weekday/time
   - exchange holidays, early closes, partial trading days

10. **Policy templates for investor archetypes**
   - starter long-term ETF investor
   - high-cash-reserve cautious investor
   - monthly contributor
   - tax-sensitive Swiss investor

---

## Safety and guardrail recommendations

## Instruction-source policy
I would explicitly define:
- which channels may give trading instructions
- whether only direct user messages count
- whether group chats are always non-authoritative
- whether files can authorize execution or only propose it
- whether cron can submit or only remind / preflight / report

## Execution permissions I would enforce
- ETF-only remains mandatory unless explicitly expanded
- only approved instruments may trade
- only supported exchanges/venues may trade
- only limit orders by default
- market orders disabled unless explicitly opt-in
- max order size per trade
- max total daily deployment
- max trades per day
- max deviation from target allocation after execution
- no sales without explicit approval
- no live submission when readiness is degraded
- no live submission if holdings/prices are stale
- no live submission if approved rows are older than a defined TTL
- no live submission without same-day preflight pass

## Operational safety improvements
- preflight bundle must be green within a short freshness window before market open
- separate “approve batch” from “arm for next market open”
- require explicit “armed until <timestamp>” semantics
- auto-expire execution authorization after missed market window or major state drift
- mandatory post-submit reconciliation and notification

## Hygiene cron jobs
Yes — a hygiene cron job is a very good idea.

Recommended jobs:
1. Daily system health digest
2. Pre-market execution readiness digest when there are armed trades
3. Post-market reconciliation digest if activity occurred
4. Weekly investor summary digest
5. Stale-state / failed-job alert digest

But these should inform and prepare — not silently widen execution permissions.

---

## What’s missing from the user request that also matters

These would make the system better and safer:

1. **Exchange calendar correctness**
   - holidays, half-days, DST edge cases

2. **Order TTL / approval expiry**
   - approvals should not stay valid forever

3. **Batch identity and replay protection**
   - each approval should be tied to a proposal hash/version

4. **Deterministic preflight bundle**
   - one canonical green/red result before transmission

5. **Operational journaling**
   - a human-readable incident log for every blocked/failed live attempt

6. **Notification policy clarity**
   - where notifications go
   - which are immediate vs digest-only
   - what counts as noise

7. **Rollback / pause controls**
   - one obvious “pause all automation” switch
   - one obvious “safe recovery checklist” surface

8. **Secrets/config hardening**
   - stronger documented secret sourcing and validation

9. **Repository hygiene**
   - clear treatment for generated outputs vs source-of-truth files

10. **Upgrade path to a real UI**
   - stable JSON contracts and interaction model for future control UI

---

## Recommended implementation plan

## Phase 101A — Live readiness truth and Monday blocker closure
Goal: create one trustworthy answer for whether the system can safely execute at next market open.

- [ ] Build a canonical `execution preflight` command that checks:
  - portfolio state
  - approval state
  - batch freshness
  - broker readiness
  - market session timing
  - stale data / holdings
  - execution policy mode
- [ ] Detect and surface approval-state mismatches across portfolio/trades/dashboard
- [ ] Add explicit “armed for next market open” semantics with expiry
- [ ] Refuse execution when approval state is ambiguous or stale
- [ ] Add one concise operator report for Monday readiness

## Phase 101B — Script surface consolidation
Goal: reduce operational ambiguity.

- [ ] Define canonical command families
- [ ] Archive/remove obsolete entrypoints
- [ ] Classify scripts as canonical/compat/debug/archive
- [ ] Add consistent `--help` and JSON output for operational commands
- [ ] Add one top-level operations guide

## Phase 101C — QA foundation hardening
Goal: make verification simple and repeatable.

- [ ] Add `npm test`
- [ ] Add grouped test scripts
- [ ] Add coverage reporting
- [ ] Create fixture directories and reusable test helpers
- [ ] Add preflight, mismatch, and exchange-calendar tests

## Phase 101D — Config and policy hardening
Goal: make automation boundaries explicit.

- [ ] Add a unified effective-config diagnostic
- [ ] Centralize env/config resolution
- [ ] Add system policy file for instruction sources and execution authority
- [ ] Separate investor intent, operator policy, broker config, and delivery config
- [ ] Document cron/heartbeat messaging rules

## Phase 101E — UX and investor interaction uplift
Goal: make the system easier to use and trust.

- [ ] Add batch proposal/approval model
- [ ] Add investor-friendly “Today / Next market window / Portfolio state / System health” views
- [ ] Improve explanation layer for trade proposals
- [ ] Add recurring contribution and cash deployment planning
- [ ] Add stronger notification lifecycle messaging

## Phase 101F — Architecture cleanup
Goal: improve maintainability before adding more power.

- [ ] Consolidate `lib/` vs `src/`
- [ ] Introduce explicit service layer
- [ ] Normalize order lifecycle domain model
- [ ] Separate source state from derived artifacts
- [ ] Remove global mutable TLS/env behavior

---

## Recommended first implementation slice

The best next implementation slice is:

### **Phase 101A — Live readiness truth and Monday blocker closure**

Reason:
- it solves the most dangerous current ambiguity
- it helps with both safety and UX
- it directly addresses the Monday execution question
- it provides a foundation for all future automation

### First concrete tasks
1. build one canonical preflight command
2. add approval-state mismatch detection
3. add “armed until market open” authorization semantics
4. test it end-to-end against current ETF portfolio state
5. regenerate dashboard/overview surfaces from the new truth model

---

## Current recommendation

Do **not** assume the system can execute Monday open purchases yet.

Before any live submission path is considered ready, the repo should produce one explicit green preflight result showing:
- broker authenticated and reachable
- live readiness healthy
- approved batch present in the active portfolio trade log
- execution mode intentionally armed for the next window
- no stale data or approval expiry
- no policy blockers

Until then, the system should remain in safe, explicit, degraded-dry-run posture.
