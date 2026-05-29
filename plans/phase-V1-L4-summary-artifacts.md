# Phase V1-L4: Value-Focused Summary Artifacts & Investor Reports

## Changes

### 1. summaryArtifacts.js
- **`explanationSummary`**: Replace `biggestDrift` with `growthSummary` and `deploymentOpportunity`
  - `growthSummary`: Plain-language description of the biggest allocation concern (on_track/watching/rebalance_needed)
  - `deploymentOpportunity`: High-level cash available for deployment signal
  - Keep `biggestDrift` in summary.json for backward compat
- **Markdown template** (`renderPortfolioSummaryMarkdown`): `Drift:` → `Balance:`; use `growthSummary`
- **HTML template** (`renderPortfolioSummaryHtml`): 
  - `Drift:` → `Balance:` in whyList; use `growthSummary`
  - `Allocation health` → `Balance check` section heading
  - Sort `holdingRows` by `valueChf` descending before rendering

### 2. investorReportingData.js
- `buildInvestorHoldingsSnapshot`: Ensure rows are sorted by `valueChf` descending
- De-emphasize drift in field names (already done: `driftPct` stays but is investor-facing)

## Test updates
- `scripts/test-structured-summary-artifacts.js`: Add assertions for `growthSummary` and `deploymentOpportunity` (both new fields in `explanations`)
- `scripts/test-cockpit-delivery-broker-block-context.js`: Already expects `biggestDrift` as object in `dailySummary` — no change needed
- `scripts/test-portfolio-summary-broker-block-section.js`: Already expects `biggestDrift` as string — no change needed (backward compat)
- `scripts/test-multi-portfolio-overview.js`: Already expects `biggestDrift` as string — no change needed (backward compat)

## Backward compat
- `biggestDrift` stays in `explanations` and `summary.json` — existing consumers unaffected
- `growthSummary` and `deploymentOpportunity` added alongside it