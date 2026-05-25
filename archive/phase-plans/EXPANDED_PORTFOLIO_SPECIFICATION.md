# Expanded Portfolio Manager Specification

_Last updated: 2026-05-06_

## 1. Why this expanded spec exists

The original `SPECIFICATION.md` defined a strong portfolio-management MVP centered on:
- Interactive Brokers
- ETF-only scope
- CHF-first portfolios
- Markdown as the control layer
- dry-run / approval-first execution safety

That spec has now been implemented substantially. The repository already covers the core lifecycle: portfolio creation, validation, ETF shortlist generation, holdings sync, proposal generation, safety gating, execution-state reconciliation, dashboard/report generation, local delivery-readiness checks, and runtime observability.

What this expanded spec adds is the next layer:
- a more user-friendly operator experience
- clearer product-level UX expectations
- richer dashboards and reports
- smoother guided workflows
- more obvious incident handling and state visibility
- a stronger definition of what would make the system feel genuinely useful to a real portfolio operator

This document therefore serves as a **product-facing post-MVP specification**. It does not replace the original spec; it extends it.

---

## 2. Current state assessment

### 2.1 What is already strong

The current implementation is strong in these areas:
- Markdown contract design and validation
- dry-run and fail-closed execution safety
- Interactive Brokers read-only holdings sync
- staged/transmitted execution policy gating
- trade lifecycle reconciliation into Markdown state
- weekly/monthly/quarterly reporting
- dashboard refresh and freshness checks
- local delivery-policy/readiness checks
- operator runbooks and incident-summary tooling
- local structured runtime-event logging and observability surfaces

### 2.2 What still needs more work

The most important gaps are no longer raw backend capability; they are **operator experience and usability** gaps.

Main remaining gaps:
1. The system is still very file/script centric rather than operator centric.
2. The dashboard is informative but not yet a true command-center UI.
3. Guided workflows exist, but they are not yet presented as a cohesive onboarding/execution cockpit.
4. Reports are good audit artifacts, but they are not yet optimized for quick decisions.
5. There is still no unified “what should I do next?” surface.
6. Alerting / delivery posture is locally modeled, but not yet turned into a polished operator-facing communication workflow.
7. Multi-portfolio oversight is still weaker than single-portfolio depth.
8. Broker execution remains intentionally guarded, but the operator UX around that guardrail can be much clearer and friendlier.

---

## 3. Product vision

The system should feel like a **portfolio operating console** for a careful long-term investor.

As a user, I would want it to do five things well:

1. **Tell me what matters now**
   - What changed?
   - What is blocked?
   - What needs approval?
   - What is drifting out of target?
   - What failed overnight?

2. **Explain why**
   - Why is a rebalance recommended?
   - Why is a trade blocked?
   - Why is a report stale?
   - Why is a broker action unsafe right now?

3. **Make safe next steps obvious**
   - Approve this
   - reject this
   - resync this
   - regenerate that
   - resolve these blockers first

4. **Be trustworthy under stress**
   - Fail closed
   - show evidence
   - keep logs readable
   - make operational state obvious
   - never hide degraded broker conditions

5. **Be pleasant and efficient to use**
   - clear dashboards
   - compact digests
   - useful reports
   - less hunting through files
   - fewer mental joins across artifacts

---

## 4. Expanded product goals

### 4.1 Operator-first dashboarding
The portfolio dashboard should become a real operator console, not just a generated summary page.

It should answer, at a glance:
- portfolio status
- last successful sync
- stale/not stale state
- cash available
- target drift
- pending approvals
- blocked actions
- safety stop conditions
- broker health
- report freshness
- next recommended actions

### 4.2 Better decision support
Trade proposals and reports should become more decision-friendly.

They should show:
- what changed since the last check
- confidence / data quality
- exact rule that triggered a recommendation
- what happens if the user does nothing
- expected allocation effect after execution
- whether the action is a buy, sell, deploy-cash step, or risk-control action

### 4.3 Better workflow UX
The system should feel like it has end-to-end workflows, not just scripts.

Examples:
- Create portfolio
- Finish onboarding gaps
- Approve ETF shortlist
- Review rebalance recommendations
- Review pending execution approvals
- Recover from broker pause state
- Review weekly/monthly/quarterly outcomes

### 4.4 Better communication surfaces
Outputs should be shaped for different operator contexts:
- quick dashboard view
- compact alert/digest view
- detailed audit report
- recovery / incident checklist view

### 4.5 Multi-portfolio readiness
Even if the first real portfolio is `portfolio/etf/`, the product should be designed to support multiple portfolios in a clean top-level overview.

---

## 5. Expanded user stories

### 5.1 Daily operator check-in
As a user, I want one view that tells me:
- whether the portfolio is healthy
- whether anything is blocked
- whether any rebalance or deployment action is recommended
- whether anything requires my approval today

### 5.2 Incident review
As a user, I want a concise incident summary when something goes wrong:
- what failed
- when it failed
- what the system did automatically
- what remains blocked
- what I should do next

### 5.3 Execution approval review
As a user, I want pending live actions presented as a review queue with:
- rationale
- safety status
- expected effect
- exact approvals required
- warning level

### 5.4 Report reading
As a user, I want reports to be usable in two modes:
- a quick skim mode for “what happened?”
- a deep audit mode for “show me the evidence and details”

### 5.5 Portfolio onboarding
As a user, I want onboarding to feel like a guided assistant rather than a list of missing fields.

### 5.6 Multi-portfolio overview
As a user, I want a top-level overview that compares all portfolios:
- total value
- last sync
- current status
- drift severity
- blocked/not blocked
- pending approvals
- last report date

---

## 6. Expanded dashboard specification

### 6.1 Dashboard layers
The product should eventually expose three dashboard layers:

#### A. Portfolio dashboard
Per-portfolio operational view.

#### B. Portfolio summary board
Top-level view across all portfolios.

#### C. Incident / approvals board
Queue-like view for exceptions, approvals, and required operator interventions.

### 6.2 Required sections for the improved portfolio dashboard

```markdown
# Dashboard: <portfolio_name>

## Health Snapshot
- Portfolio status:
- Strategy status:
- Broker health:
- Last successful sync:
- Data freshness:
- Execution posture:
- Delivery posture:
- Pending approvals:
- Active blockers:

## Portfolio Value Snapshot
- Total value CHF:
- Cash CHF:
- Invested CHF:
- Daily move CHF:
- Daily move %:
- Since last report CHF:
- Since last report %:

## Allocation Health
| Sleeve | Current % | Target % | Drift % | Within band | Action needed |

## Instrument Actions Queue
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |

## Safety / Risk Diagnostics
- Safety status:
- Risk-limit warnings:
- Broker/API warnings:
- Stale data warnings:
- Execution pause state:

## Pending Operator Actions
1. <action>
2. <action>

## Recent Material Events
| Time | Event type | Severity | Summary | Next step |

## Report / Delivery Status
- Weekly report:
- Monthly report:
- Quarterly report:
- Delivery readiness:
- Failure alert readiness:

## Recommended Next Step
A single concise recommendation for what the operator should do next.
```

### 6.3 UX goals for the dashboard
- extremely skimmable
- obvious severity levels
- clear separation between informative vs actionable items
- one “best next step” summary
- fewer dense paragraphs, more structured tables/lists

---

## 7. Expanded reporting specification

### 7.1 Report modes
Each report should support two reading modes:

#### A. Executive summary mode
For fast reading:
- what happened
- key moves
- important warnings
- recommended actions

#### B. Audit detail mode
For deep review:
- holdings changes
- trade log summary
- drift metrics
- compliance/risk checks
- freshness and delivery metadata
- incident notes

### 7.2 Required improvements to reports
Reports should clearly show:
- portfolio objective
- period summary in plain English
- best/worst contributors if data is available
- drift and compliance state
- what changed since the prior report
- pending issues or unresolved questions
- whether recommended actions are informational, optional, or urgent

### 7.3 Report usability goals
As a user, I want reports to answer:
- Did the portfolio behave as intended?
- Did I get closer to target allocation?
- Did any risk controls trigger?
- What needs my attention before the next cycle?

---

## 8. Expanded workflow specification

### 8.1 Guided onboarding workflow
The onboarding flow should evolve from “missing questions” into a guided wizard-like structure with stages:
1. portfolio identity
2. investor profile
3. allocation design
4. instrument preferences
5. execution posture
6. risk and safety review
7. activation readiness review

### 8.2 Approval queue workflow
The system should provide a unified queue for:
- ETF shortlist approvals
- trade approvals
- recovery acknowledgements
- transmitted-live acknowledgements

### 8.3 Recovery workflow
Recovery workflows should explicitly guide the operator through:
- broker degraded
- stale holdings
- stale price data
- execution pause state
- report delivery not ready

### 8.4 Daily operating workflow
A target daily loop:
1. read dashboard summary
2. inspect blockers / pending approvals
3. review proposed actions
4. approve/reject as appropriate
5. verify post-action state
6. let scheduled reporting capture the result

---

## 9. Expanded UI / presentation requirements

### 9.1 Short-term UI requirement
Even without a full web app, the product should expose UI-like outputs through:
- improved Markdown dashboards
- compact machine-readable JSON summaries
- optional generated HTML dashboards/reports
- queue-style summaries for alerts and approvals

### 9.2 Mid-term UI requirement
A future control UI should be able to render:
- portfolio cards
- drift meters
- health badges
- pending approvals
- event timeline
- report history
- operator action buttons (or action-ready references)

### 9.3 Minimal UI artifacts to support next
The repo should eventually generate, at minimum:
- `portfolio/<name>/summary.json`
- `runtime/overview/portfolio-index.json`
- `runtime/overview/pending-actions.json`
- a renderable HTML summary page per portfolio
- a renderable HTML multi-portfolio overview page

---

## 10. Expanded data / artifact specification

### 10.1 New suggested artifacts

#### `summary.json`
Per-portfolio structured summary for dashboards/UIs.

Suggested fields:
- portfolio name
- total value
- cash
- invested
- last sync
- freshness status
- broker health
- execution posture
- pending approvals count
- blockers count
- recommended next action

#### `pending-actions.json`
A queue of actions across portfolios.

Suggested fields:
- portfolio
- action type
- severity
- status
- summary
- blocking reason
- created at
- recommended operator action

#### `incident-log.jsonl`
Structured operator-facing incident feed.

Suggested fields:
- timestamp
- portfolio
- event type
- severity
- summary
- root cause hint
- resolution status

---

## 11. Expanded safety and UX principles

1. **Safe should also be understandable**
   - blocking is not enough; explain the block clearly.

2. **Every warning should imply a next step**
   - no dead-end warnings.

3. **Every recommendation should include a reason**
   - the operator should not have to guess.

4. **Every important state should be visible in one place**
   - reduce hunting across files.

5. **Every automation path should expose readiness and failure state**
   - especially reporting and execution.

6. **Operator confidence matters as much as correctness**
   - the system should feel calm, clear, and legible.

---

## 12. What I would want as a user

If I were using this system personally, I would want:

### 12.1 One daily summary page
A single page that says:
- portfolio healthy / warning / blocked
- cash waiting to deploy
- biggest drift today
- whether any trade needs approval
- whether broker/reporting is healthy
- what I should do next

### 12.2 A clean approvals queue
I would want pending approvals grouped in one place with:
- urgency
- explanation
- effect if approved
- effect if ignored

### 12.3 Better “why” explanations
I would want the system to say things like:
- “Global equities are 6.4% under target and outside the allowed band.”
- “No trade proposed because the drift is below minimum useful trade size.”
- “Execution blocked because price data is stale by 19 hours.”

### 12.4 A multi-portfolio summary board
If I run several portfolios, I would want a homepage that compares them quickly.

### 12.5 More beautiful and useful reports
I would want reports that feel like something I would actually read, not just archive.

### 12.6 Simpler operator recovery paths
If the broker degrades or a job fails, I would want:
- plain-English summary
- clear next steps
- evidence
- no guessing

---

## 13. Expanded acceptance criteria

This expanded spec should be considered meaningfully satisfied when:

1. the system provides a more UX-oriented dashboard with explicit health, freshness, blockers, and next actions
2. the system exposes structured summary artifacts usable by a future UI
3. the system provides a top-level multi-portfolio overview artifact
4. the system provides a unified pending-actions / approvals artifact
5. reports clearly separate summary vs audit detail
6. dashboard and report outputs are more decision-oriented and less file-centric
7. recovery / incident outputs clearly tell the operator what to do next
8. all of the above preserve existing safety posture and auditability

---

## 14. Explicitly out of scope for this expansion

Still out of scope unless separately approved:
- options / derivatives / leverage
- social features
- prediction-heavy trading signals
- fully autonomous trading without explicit safety posture
- storing secrets in Markdown
- replacing audit-friendly Markdown with opaque-only storage

---

## 15. Recommended next implementation themes

The most valuable next themes are:
1. dashboard and summary UX uplift
2. structured UI artifacts (`summary.json`, `pending-actions.json`, multi-portfolio index)
3. approval queue / action-center workflow
4. improved reports for decision support
5. multi-portfolio overview and operator cockpit

These are the changes most likely to make the system feel genuinely useful and pleasant to operate, not just technically complete.
