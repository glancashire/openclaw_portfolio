# Email Dashboard Redesign Spec

Date: 2026-06-02 08:21 UTC
Status: complete (shipped 2026-06-02)
Related plan: `CURRENT_PLAN.md`

## Objective
Define the target investor email dashboard format before implementation.

This spec turns the plan into a concrete output contract for:
- HTML investor email
- plain-text fallback email
- minimal, clean, decision-oriented presentation

The redesign should feel:
- calmer
- cleaner
- easier to scan
- more useful in under 10 seconds

---

# 1. Target information hierarchy

## Primary rule
The email should answer these questions in order:
1. How much is invested?
2. What is the portfolio worth now in CHF?
3. How much cash is left?
4. Is the portfolio on track or not?
5. What is the core recommendation?
6. Which holdings matter most right now?
7. What are the main risks and opportunities?

## Section order
1. Header summary card
2. Core recommendation strip
3. Holdings table
4. Footer analysis

Everything else is secondary and should be removed or demoted from the investor email.

---

# 2. Header summary card

## Purpose
Give a complete high-level portfolio snapshot in one compact block.

## Required fields
- Portfolio name
- Current value (CHF)
- Invested money (CHF)
- Remaining cash (CHF)
- Status
- Core recommendation

## Visual hierarchy
- **Largest text:** Current value in CHF
- **Second level:** Invested money and remaining cash
- **Third level:** Status badge + snapshot timestamp
- **Below summary:** one-sentence core recommendation

## Content contract

### Example structure
- Portfolio: ETF Portfolio
- Current value: CHF 100,974
- Invested money: CHF 100,197
- Remaining cash: CHF 777
- Status: Rebalance watch
- Core recommendation: Hold current positions; rebuild cash before adding more AI exposure.

## Status vocabulary
Allowed statuses should be short and investor-readable:
- On track
- Rebalance watch
- Attention needed
- Defensive posture

Avoid operator/system jargon such as:
- ready_for_review
- delivery posture
- execution pause state
- contract intelligence
- pending operator queue

## Formatting rules
- Currency always shown as `CHF 12,345` style or existing project-consistent format
- No more than one status badge
- Core recommendation must be a single sentence
- Snapshot date/time should be small and muted

---

# 3. Core recommendation strip

## Purpose
Show the single most important action-oriented takeaway.

## Placement
Immediately below header summary.

## Content rules
- One sentence only
- Max ~120 characters preferred
- Written in plain English
- Investment-oriented, not operator-oriented

## Allowed examples
- Hold current positions; rebuild cash with the next contribution.
- Hold AI positions; use new cash to diversify outside US megacap tech.
- Add selectively to underweight core holdings; avoid adding to semiconductors for now.

## Not allowed
- Mentions of runtime artifacts
- Mentions of delivery/backfill/reconciliation unless financially material
- Raw execution-state wording

---

# 4. Holdings table

## Purpose
Provide a concise position-by-position decision surface.

## Required columns
1. Instrument
2. Value CHF
3. Avg. cost CHF
4. Gain CHF
5. Gain %
6. Holding %
7. Recommendation

## Column definitions
- **Instrument:** short instrument name or symbol-first name
- **Value CHF:** current position value in CHF
- **Avg. cost CHF:** total cost basis in CHF for the position
- **Gain CHF:** unrealized gain/loss in CHF
- **Gain %:** unrealized gain/loss as percentage
- **Holding %:** portfolio weight
- **Recommendation:** HOLD / BUY / SELL

## Column priority
Most visually prominent columns:
- Value CHF
- Recommendation

Secondary:
- Gain CHF
- Gain %
- Holding %

Least prominent:
- Avg. cost CHF

## Sorting
Default sort: descending by Value CHF.

## Recommendation semantics

### HOLD
Use when:
- current size is acceptable
- no near-term action is preferred
- position is newly established and should settle
- recommendation confidence is mixed

### BUY
Use when:
- holding is underweight versus intended target
- it is a preferred future add
- no material risk override is active

### SELL
Use when:
- position is materially oversized
- risk concentration is above tolerance
- the portfolio would be improved by trimming

## Important guardrail
If SELL would be too strong or unsupported by explicit policy, downgrade to HOLD.

## Rendering style
- Recommendation should render as a compact colored pill or bold label
- HOLD = neutral gray
- BUY = green
- SELL = red

Use text plus background/border cues where possible, but remain email-safe.

## Example row
| Instrument | Value CHF | Avg. cost CHF | Gain CHF | Gain % | Holding % | Recommendation |
|---|---:|---:|---:|---:|---:|---|
| SXR8 | CHF 24,886 | CHF 26,122 | -CHF 1,236 | -4.7% | 24.6% | HOLD |

---

# 5. Footer analysis

## Purpose
End with a short plain-language interpretation.

## Required subsections
- Improve
- Risks
- Opportunities

## Style rules
- one short paragraph or 3 bullet lines
- concise
- no jargon
- no long macro commentary
- no more than 1–2 points per subsection

## Content examples

### Improve
- Cash is below the preferred buffer; rebuild dry powder before adding more equity risk.

### Risks
- The portfolio is now more exposed to US large-cap and AI-theme drawdowns.

### Opportunities
- Future contributions can improve diversification through Japan or other non-AI core sleeves.

## Length target
Entire footer analysis should fit within ~4–6 lines in a normal email client.

---

# 6. Minimal visual design system

## Principles
- light background
- white cards/sections
- subtle borders
- strong typography hierarchy
- restrained spacing
- no decorative clutter

## Color palette (approximate guidance)
- Text primary: near-black / dark gray
- Text secondary: muted gray
- Positive: green
- Negative: red
- Caution: amber
- Background: off-white or pure white
- Borders: very light gray

## Email-safe styling guidance
Use:
- inline styles or email-safe embedded CSS only
- system fonts or safe fallbacks
- tables for maximum compatibility where needed
- simple border radius only if already supported across existing templates

Avoid:
- gradients
- complex layout tricks
- JS
- hover interactions
- color-only meaning

---

# 7. HTML structure mockup

```html
[Email container]
  [Header card]
    Portfolio name
    Current value (large)
    Invested money | Remaining cash
    Status badge
    Snapshot timestamp
  [Recommendation strip]
    Core recommendation sentence
  [Holdings table]
    Instrument | Value CHF | Avg. cost CHF | Gain CHF | Gain % | Holding % | Recommendation
  [Footer analysis]
    Improve: ...
    Risks: ...
    Opportunities: ...
```

## HTML output goals
- readable on mobile
- no section should feel overloaded
- first screen should already show the header summary and recommendation

---

# 8. Plain-text fallback contract

The text email should preserve the same hierarchy.

## Required order
1. Portfolio name
2. Current value / invested / cash / status
3. Core recommendation
4. Holdings list in compact aligned rows
5. Improve / Risks / Opportunities footer

## Text example
```text
ETF Portfolio
Current value: CHF 100,974
Invested money: CHF 100,197
Remaining cash: CHF 777
Status: Rebalance watch
Recommendation: Hold current positions; rebuild cash before adding more AI exposure.

Holdings
SXR8   Value CHF 24,886  Avg cost CHF 26,122  Gain -CHF 1,236  Gain -4.7%  Weight 24.6%  HOLD
EMUAA  Value CHF 13,881  Avg cost CHF 14,480  Gain   -CHF 599  Gain -4.1%  Weight 13.7%  HOLD
...

Improve: Cash is below the preferred buffer; rebuild dry powder before adding more equity risk.
Risks: The portfolio is more exposed to US large-cap and AI-theme drawdowns.
Opportunities: Future additions can diversify via Japan or other non-AI core sleeves.
```

---

# 9. Content to remove or demote from investor email

These should not appear in the main investor email body unless financially material:
- operator queue counts
- delivery posture
- execution lifecycle stats
- contract intelligence readiness
- runtime observability warnings
- pending backfill review notes
- open-runner handoff/retry details
- raw broker health implementation details

If needed, these belong in:
- operator dashboard
- health report
- debug appendix
- internal/admin surfaces

---

# 10. Recommendation engine rules (v1)

## Inputs to use
- current portfolio weight
- target weight
- whether position is newly bought
- concentration/risk flags if they exist cleanly
- optional strategy priority list

## Suggested thresholds
These are implementation defaults and can be tuned later:
- BUY if under target by >= 1.0 percentage point and not recently bought
- SELL if over target by >= 2.0 percentage points and concentration rule permits signaling
- otherwise HOLD

## Fresh-buy cooldown
If a holding was just bought in the latest cycle, default to HOLD for the next investor report unless a hard risk rule says otherwise.

This matters for the newly added AI sleeves.

---

# 11. Acceptance criteria

The redesign is successful if:
- the header clearly emphasizes current value, invested money, remaining cash, status, and core recommendation
- the holdings table includes all requested fields
- recommendations are obvious and readable
- the footer gives a short useful summary of improvements, risks, and opportunities
- the email is materially cleaner and shorter than the current operator-heavy version
- the plain-text fallback preserves the same logic and order

---

# 12. Implementation notes

## Suggested file touchpoints
Likely starting points:
- `src/reporting/dashboardGenerator.js`
- `src/reporting/summaryArtifacts.js`
- investor email rendering/test paths around:
  - `scripts/test-email-html-rendering.js`
  - `scripts/test-report-email-rendering.js`

## Suggested implementation order
1. locate exact investor email renderer
2. create minimal section renderer helpers
3. implement new HTML header/recommendation/table/footer
4. implement text fallback equivalent
5. update tests
6. generate live sample and review

---

# 13. Recommended default copy for current portfolio state

## Header summary draft
- Current value: CHF 100,974
- Invested money: CHF 100,197
- Remaining cash: CHF 777
- Status: Rebalance watch
- Core recommendation: Hold current positions; rebuild cash before adding more equity risk.

## Footer draft
- Improve: Rebuild the cash buffer with the next contribution before adding more thematic exposure.
- Risks: The portfolio is concentrated in US large-cap equities and the AI buildout theme.
- Opportunities: Future contributions can improve diversification through non-AI core sleeves such as Japan or broader international exposure.

---

# 14. Deferred items
Not part of the first implementation pass:
- sparklines
- multi-period performance chips
- interactive drill-down
- sector heatmaps
- benchmark comparison panels
- detailed sleeve diagnostics in investor email
