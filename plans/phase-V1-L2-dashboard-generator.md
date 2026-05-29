# Phase V1-L2: Value-Focused Dashboard Generator

## What changes

1. **Reorder sections** in `generateDashboard()` output:
   - Portfolio Value Snapshot (first — contains profit, daily/weekly change)
   - Profit / Loss (detailed P/L table)
   - Holdings (compact holdings table, already sorted by value)
   - Instrument Actions Queue (value-framed, before Pending Operator Actions)
   - Balance Check (renamed from "Allocation Health", de-emphasized)
   - Pending Operator Actions (after Instrument Actions Queue, not before)
   - then operational sections (Safety, Contract Intelligence, Operator Queue Summary, etc.)

2. **Reframe `formatInstrumentActionRows`** — instruments with no active proposal get a value-framed reason:
   - "No active proposal" → "Target is {target}% — no active buy planned" or "Target is {target}% — position fully sized, hold"
   - "CASH-CHF" keep existing "Keep this portion in CHF cash" reasoning
   - Change `suggestedAction` for watch instruments to "deploy" instead of "watch" when target > 0 and current = 0

3. **Reframe `recommendedActions()` default message**:
   - "Refresh history snapshots and only open a new live basket when a real drift or cash-deployment reason exists" → already replaced; keep the value-oriented message from the existing code path

4. **Add deployment framing** for cash in the value snapshot (the cash % row is already there, may need a comment nearby)

5. **Sort Profit/Loss table by value descending** — already done (costBasis.rows sorted before rendering)

6. **Update `test-dashboard-command-center.js`** — the test already expects `## Balance Check`, `## Instrument Actions Queue`, and has no strict ordering for mid/sections sections. Only check that "Pending Operator Actions" comes after "Instrument Actions Queue".

## Files to change

- `src/reporting/dashboardGenerator.js` — section reorder, `formatInstrumentActionRows` reframing, `recommendedActions` refinements
- `scripts/test-dashboard-command-center.js` — assertion updates for new action-reason strings
- `portfolio/etf/dashboard.md` — regenerated
- `plans/phase-V1-L2-dashboard-generator.md` — this plan

## Verification

- `bash .githooks/pre-commit` — must pass
- `npm test` — must pass (test-dashboard-command-center.js is the main assertion surface)
- `scripts/show-dashboard.js etf` — spot-check output

## Constraint

- Don't change underlying data computation — only presentation and language
- Keep all operational/safety/execution sections — just reorder
- `show-dashboard.js` reads section headers via regex (`section('Balance Check')`, `section('Profit / Loss')`, `section('Holdings')`) — those names must stay the same