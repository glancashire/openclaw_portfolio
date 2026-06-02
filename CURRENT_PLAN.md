# Email Dashboard Improvement Plan

Date: 2026-06-02
Scope: ETF portfolio email/dashboard reporting refresh
Status: in_progress

## Goal
Improve the investor email dashboard so it is cleaner, simpler, more visual, and more decision-oriented.

The redesign should:
- use a minimal design with restrained color cues
- be concise and easy to scan on desktop and mobile email clients
- surface the most important portfolio facts first
- make holdings-level recommendations obvious
- end with a short human-readable analysis of risks, opportunities, and improvements

## Requested UX shape

### 1) Header / overall summary
Put the focus on:
- invested money
- current value in CHF
- remaining cash
- status
- core recommendation

### 2) Holdings detail table
Put the focus on:
- value in CHF
- avg. cost CHF
- gain CHF
- gain %
- holding %
- recommendation: HOLD / BUY / SELL

### 3) Footer / short analysis
Include a short, plain-language analysis covering:
- what could be improved
- main risks
- main opportunities

## Non-goals
- No large increase in reporting complexity
- No dense control-center/operator diagnostics in the investor email body
- No heavy visual treatment that breaks across major email clients
- No dependence on JavaScript in email rendering

## Design direction

### Principles
- Minimal, clean, investor-readable
- Strong visual hierarchy
- Color used sparingly and semantically only
- Short labels, short paragraphs, short tables
- Prefer clarity over completeness in the email itself

### Color system (email-safe)
Use a restrained palette with inline-safe styling:
- neutral dark text for default values
- green for positive gains / positive status
- red for losses / warnings requiring attention
- amber for caution / watch items
- muted gray for secondary context

Do not rely on color alone; always pair with labels/text.

### Layout hierarchy
1. Portfolio header card
2. Core recommendation strip
3. Holdings table
4. Footer analysis block

## Proposed content model

### A. Header card
Fields to display prominently:
- Portfolio name
- Current value (CHF) — largest number on page
- Invested money (CHF)
- Remaining cash (CHF)
- Status (e.g. On track / Attention needed / Rebalance needed)
- Core recommendation (single sentence)

Optional small secondary line:
- date/time of snapshot
- daily or since-last-report delta only if it is clean and trusted

### B. Holdings table
Columns:
- Instrument
- Value CHF
- Avg. cost CHF
- Gain CHF
- Gain %
- Holding %
- Recommendation

Column priorities:
- Keep Value CHF and Recommendation visually strongest
- Keep Gain CHF / Gain % compact but easy to compare
- Recommendation should render as a compact pill or bold label:
  - HOLD
  - BUY
  - SELL

Recommendation semantics (initial version)
- HOLD: position is near desired size or no action preferred
- BUY: under target and preferred next deployment candidate
- SELL: above target or risk concentration meaningfully above tolerance

If recommendation confidence is weak, default to HOLD instead of over-signaling.

### C. Footer analysis block
Short 3-part text block:
- Improve: one or two concrete improvements
- Risks: one or two main risks
- Opportunities: one or two main opportunities

Tone:
- plain English
- concise
- no operator jargon
- no raw system state unless it changes investment meaning

## Likely code surfaces
Primary likely files/modules:
- `src/reporting/dashboardGenerator.js`
- `src/reporting/summaryArtifacts.js`
- email HTML/text rendering paths referenced by:
  - `scripts/test-email-html-rendering.js`
  - `scripts/test-report-email-rendering.js`
  - `scripts/test-trade-notification-email.js`
- any report-cycle wrappers calling dashboard regeneration:
  - `scripts/run-report-cycle.js`
  - `scripts/regenerate-dashboard.js`

Need to identify the exact investor email template/render function before implementation.

## Delivery plan

### Phase 1 — discovery and contract map
1. Trace the current investor email generation path end-to-end.
2. Identify:
   - source data contract
   - HTML renderer
   - text fallback renderer
   - tests covering rendering
3. Capture current output example(s) for before/after comparison.

Verification:
- list exact source files/functions
- produce one current sample HTML/text artifact path or test evidence

### Phase 2 — redesign spec
1. Define the exact email section order.
2. Define header fields and wording.
3. Define holdings columns and formatting rules.
4. Define recommendation rules and fallback behavior.
5. Define footer analysis generation rules.

Verification:
- short written spec/diff from current layout
- example mock content block in markdown or HTML snippet

### Phase 3 — implementation
1. Refactor the email HTML renderer to the new minimal layout.
2. Refactor the plain-text fallback to mirror the same information hierarchy.
3. Remove or demote operator-only noise from the investor email body.
4. Add semantic recommendation rendering for each holding.
5. Add short footer analysis synthesis.

Verification:
- direct file diff inspection
- sample generated HTML/text output

### Phase 4 — tests and rendering hardening
Add/update tests for:
- header prioritizes current value / invested money / cash / status / recommendation
- holdings table includes required columns
- recommendation labels render correctly
- positive/negative styling is applied safely
- footer analysis renders concise improve/risk/opportunity sections
- plain-text fallback preserves the same hierarchy
- mobile-width / narrow layout sanity where testable by markup inspection

Verification:
- targeted tests pass

### Phase 5 — polish and rollout
1. Tighten holding-level recommendation rules so row signals do not fight the portfolio-level cash/risk posture.
2. Slim the holdings table styling for cleaner mobile/desktop email scanning.
3. Generate a fresh report artifact from live portfolio data and inspect HTML/text output for wording conflicts.
4. Adjust labels where totals differ (for example holdings value vs. total portfolio value including cash).

Verification:
- generated artifact inspection
- targeted renderer tests still pass
- live sample uses aligned labels and calmer recommendation signals

## Recommendation logic (initial practical rules)
Use a simple first-pass ruleset to avoid misleading signals:
- BUY:
  - under target weight by a meaningful margin
  - and in approved next-deployment set
  - and no block/risk override active
- SELL:
  - over target weight by a meaningful margin
  - or concentration/risk rule triggered
- HOLD:
  - default when position is roughly on target, newly established, blocked from action, or confidence is mixed

Important:
- In investor email, recommendation should be investment-oriented, not operator-workflow-oriented.
- Avoid showing transient execution workflow states as portfolio recommendations.

## Copy examples

### Header examples
- Status: On track
- Core recommendation: Hold current positions; rebuild cash before adding more AI exposure.

Alternative when action exists:
- Status: Rebalance watch
- Core recommendation: Prioritize cash rebuilding and non-AI diversification with the next inflow.

### Footer examples
- Improve: Cash is below the preferred buffer; rebuild dry powder with the next contribution.
- Risks: The portfolio is now more sensitive to US large-cap and AI-theme drawdowns.
- Opportunities: Future additions can diversify the portfolio through Japan or broader non-AI sleeves.

## Open questions to resolve in implementation
- Where should recommendation logic live: dashboard generator vs summary artifact layer?
- Should SELL ever appear in email without an explicit approved reduction plan?
- Should the footer analysis be deterministic/rules-based or lightly templated from portfolio state?
- Which current warnings belong in operator-only surfaces and must be excluded from investor email?

## Suggested execution order
1. Discovery
2. Short redesign spec/mock
3. HTML/text renderer change
4. Tests
5. Live artifact inspection

## Verification gates
Minimum gates before calling this done:
- targeted email rendering tests pass
- one generated live HTML artifact inspected
- one plain-text artifact inspected
- header contains the requested five focus fields
- holdings section contains the requested six focus columns plus recommendation
- footer includes improve / risks / opportunities

## Success criteria
The new email dashboard should let Graham understand, within ~10 seconds:
- how much is invested
- what the portfolio is worth now in CHF
- how much cash remains
- whether the portfolio is on track
- what the main recommendation is
- which holdings are winners/losers and what action is suggested
- what the main risk/opportunity summary is

## Nice-to-have follow-ups
- compact badges for sleeve classification (core / thematic / cash)
- small sparkline or mini-delta chip if email compatibility allows
- optional “Why this recommendation?” note behind BUY/SELL labels in a secondary column or tooltip-free text fallback
