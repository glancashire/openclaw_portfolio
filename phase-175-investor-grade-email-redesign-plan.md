# Phase 175 — Investor-grade email redesign plan

## Goal

Redesign all outbound portfolio email surfaces so they read like a crisp investor update: beautiful layout, immediate management summary, importance-ordered facts, and CHF-normalized performance framing that highlights current portfolio gains since purchase in the clearest possible way.

## Product intent

Every portfolio email should answer, in order:

1. What happened and why it matters.
2. What the portfolio is worth now in CHF.
3. How much it is up or down since purchase in CHF and percent.
4. What the most important risks, blockers, and required actions are.
5. What supporting facts the investor may want next.

## Scope

### In scope

- redesign report email structure for stronger hierarchy and investor readability
- add an LLM-generated management summary block at the top of report emails
- normalize headline portfolio performance to CHF
- surface gains since purchase for the current portfolio in CHF and percent near the top
- order sections by investor importance instead of internal implementation order
- improve typography, spacing, metric cards, tables, and visual grouping
- preserve plain-text fallbacks with clearer structure
- add/update focused rendering tests for the new structure and CHF framing
- run at least one live health/report email flow as evidence

### Out of scope

- changing broker execution policy
n- changing recipient policy or email provider
- inventing unsupported portfolio performance data if the source facts are unavailable
- altering ETF-only / CHF-first MVP guardrails

## Design principles

- Lead with a management-summary voice that is concise, factual, and investor-oriented.
- Show the most decision-relevant metrics above the fold.
- Present all headline money figures in CHF.
- Make positive/negative performance instantly legible.
- Put exceptions, risks, and required operator actions before long reference sections.
- Keep supporting detail visible but de-emphasized lower in the email.

## Implementation steps

1. Inspect current summary/report inputs to find available cost-basis, valuation, and currency-normalization data.
2. Define the target email information architecture for investor-facing reports.
3. Add a management-summary generator entry point and wire it into report email rendering.
4. Add CHF-normalized headline metrics including gains since purchase if source data is available.
5. Redesign HTML email sections/cards/tables for readability and visual polish.
6. Improve plain-text email fallback ordering and summary language.
7. Add focused tests for management-summary placement, CHF gain framing, and section ordering.
8. Re-run relevant email/report regressions.
9. Run one live email flow to verify delivery and rendered content.

## Verification gates

- `node scripts/test-email-html-rendering.js`
- `node scripts/test-health-report-priority-order.js`
- `node scripts/test-health-report-runner.js`
- `node scripts/test-health-check-cli.js`
- `node scripts/run-health-check.js /home/ubuntu/.openclaw/workspace/portfolio/etf --send-email`

## Success criteria

- report emails open with an investor-style management summary
- top-of-email metrics are CHF-normalized
- gains since purchase are shown prominently when source data exists
- section order clearly reflects investor importance
- HTML and text emails remain readable and policy-compatible
- focused regressions and one live email flow pass
