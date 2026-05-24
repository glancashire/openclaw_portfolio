# Phase 159 — Fill / Purchase Report Redesign Plan

## Objectives
- Redesign the investor-facing fill/purchase notification to be minimal, clear, and useful for a casual investor.
- Use the normalized fill data contract so commission-inclusive CHF cost is shown safely when available.
- Show symbol and full instrument name together, quantity purchased, price per unit, total cost, cost in CHF including commission, and resulting total held.
- Preserve compatible text fallback behavior for existing delivery and notifier paths.

## Risks / Dependencies
- Existing trade notification inputs may not always include full instrument names or resulting holdings quantities; the template must degrade gracefully without inventing values.
- Trade notifier subject/text contracts may be used elsewhere; tightening wording too aggressively could break downstream expectations.
- Some trade payloads distinguish gross trade cost, fees, and actual CHF inconsistently; normalized fill logic must remain the single source of truth.

## Actionable Checklist
- Audit current trade notification inputs and identify the best seam for normalized fill data injection.
- Add/extend tests for HTML and text trade notifications covering:
  - symbol + name presentation
  - quantity purchased
  - price per unit
  - total cost
  - commission-inclusive CHF cost
  - resulting total held
  - graceful fallbacks when cost basis or holdings-after-fill data is unavailable
- Implement shared normalization/plumbing needed by trade notification rendering.
- Redesign the trade notification HTML into a cleaner investor summary plus compact execution details.
- Update the plain-text fallback to preserve compatibility while adding the new investor-facing information.
- Run focused tests until green, then run the full suite.
- Clean unrelated generated/runtime churn, commit the phase, and push.

## Acceptance Criteria
- Fill/purchase notifications clearly present symbol and instrument name in both HTML and text outputs.
- Notifications show purchase quantity, unit price, total trade cost, CHF cost including commission, and resulting total held whenever source data supports it.
- Missing values are labeled clearly rather than shown as misleading zeroes.
- Existing notifier flows continue to pass regression coverage.
- Focused reporting/trade tests and the full repository test suite pass.
