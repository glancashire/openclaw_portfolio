# Phase 176 — Investor-grade trade email redesign plan

## Goal

Upgrade trade/fill notification emails so they match the investor-grade report email system: clear management summary first, CHF-first performance framing, strong hierarchy, and concise actionable context after every executed fill.

## Product intent

Every trade/fill email should answer, in order:

1. What just executed and why it matters.
2. What the trade changed in CHF terms.
3. What the portfolio now looks like in CHF.
4. Whether any immediate follow-up or remaining open orders matter.
5. What supporting detail the investor may want next.

## Scope

### In scope

- redesign trade/fill notification HTML for investor readability and visual polish
- add a management-summary block at the top of fill emails
- add CHF-first headline metrics for the executed trade and post-trade portfolio
- show post-trade portfolio posture clearly, including cash and allocation drift
- improve the plain-text fill email fallback ordering and readability
- preserve delivery policy and Mailgun transport behavior
- add focused rendering tests for the new fill email structure
- run the relevant rendering/test slice to verify compatibility

### Out of scope

- changing trade execution policy
- changing recipients or provider policy
- inventing unavailable cost-basis or P&L fields not present in the fill notification inputs
- changing non-email broker workflow behavior

## Design principles

- lead with a concise investor-style explanation of the fill
- keep all headline money figures in CHF where possible
- make the post-trade portfolio effect immediately visible
- put immediate follow-up items before raw execution detail
- keep support/reference detail available but visually lower priority

## Implementation steps

1. Inspect the current trade notification inputs and derive the reliable investor-facing fields.
2. Define a target information architecture for fill emails.
3. Add a management-summary section at the top of the fill email.
4. Add CHF-first headline metrics for execution and post-trade portfolio state.
5. Redesign the HTML fill notification structure using the shared email design system.
6. Improve the plain-text fill email fallback ordering and clarity.
7. Expand focused rendering tests for the new trade email structure.
8. Re-run the relevant email/report regression slice until green.

## Verification gates

- `node scripts/test-email-html-rendering.js`
- `node scripts/test-health-report-priority-order.js`
- `node scripts/test-health-report-runner.js`
- `node scripts/test-health-check-cli.js`

## Success criteria

- fill emails open with an investor-style summary
- top-of-email metrics are CHF-first and decision-relevant
- post-trade portfolio state is clearer than the old execution-centric layout
- HTML and text notifications remain readable and delivery-compatible
- focused regression gates pass
