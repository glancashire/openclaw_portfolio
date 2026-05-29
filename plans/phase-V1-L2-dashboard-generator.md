# Phase Plan: Layer 2 — Dashboard Generator

## Objectives

Restructure `dashboardGenerator.js` to lead with value/profit, de-emphasize allocation to a background health check, and change recommendation language from drift-oriented to value-oriented.

## Changes

### 1. Section order in `generateDashboard()` output

New order:
1. `## Immediate Status` (keep — operational anchor)
2. `## Health Snapshot` (keep)
3. `## Portfolio Value Snapshot` (promote — leads with value)
4. `## Profit / Loss` (promote — per-holding P/L)
5. `## Holdings` (NEW — sorted-by-value table as compact alternative to full Profit/Loss for rich surfaces)
6. `## Balance Check` (rename from `## Allocation Health`, remove de-emphasis note, compact header)
7. `## Instrument Actions Queue` (keep)
8. Everything else unchanged (Safety, Contract Intelligence, Operator Queue, Events, Reports, Recommended Next Step, Status Labels, Risk Warnings, Observability, Execution Lifecycle, Execution Plan, Recent Trades)

### 2. Recommendation language

In `recommendedActions()`:
- Replace "Review current allocation versus strategic targets before generating any fresh live basket." with value-oriented next step
- Remove default: "Refresh history snapshots and only open a new live basket when a real drift or cash-deployment reason exists."
- New default when portfolio is on-track and cash exists: "Portfolio is on track — consider deploying available cash into underweight positions."
- New default when all positions are sized: "Portfolio is performing as intended. Hold current positions and review after next market session."

In `bestNextStep()` output formatting — use value language in formatted step text.

### 3. Allocation section cleanup

- Rename section to `## Balance Check` (keep content, only heading changes)
- Remove the line: "Allocation drift is tracked but de-emphasized below profit/loss. Detail table follows for reference."
- The table itself (Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason) stays as-is

## Risks

- No snapshot tests for exact dashboard markdown structure (confirmed by grep)
- Some operator automation may parse specific section headings — `Allocation Health` → `Balance Check` is a visible change
- Recommendation text changes propagate to any downstream consumers of `Recommended Next Step` section

## Checklist

- [ ] Update section order in `generateDashboard()` output template
- [ ] Rename `## Allocation Health` → `## Balance Check`
- [ ] Remove de-emphasis note from allocation section
- [ ] Add `## Holdings` section (sorted by value CHF, compact ticker + value + weight + P/L)
- [ ] Update `recommendedActions()` strings
- [ ] Regenerate `portfolio/etf/dashboard.md` by running the generator
- [ ] Run `node .githooks/pre-commit`
- [ ] Run `npm test` (full suite)
- [ ] Commit: `Phase V1-L2: value-first dashboard layout + recommendation language`
- [ ] Push

## Acceptance Criteria

- Dashboard.md leads with Portfolio Value Snapshot section
- Profit/Loss section appears before Balance Check
- Allocation section header is "Balance Check" not "Allocation Health"
- No "Allocation drift is tracked but de-emphasized" note appears
- Recommendation language uses "deploy", "grow", "hold" framing