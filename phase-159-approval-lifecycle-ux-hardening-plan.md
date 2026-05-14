# Phase 159 — Approval lifecycle UX hardening plan

## Goal
Make stale approvals and approval-queue state easier to operate by adding a dedicated stale-approval refresh surface, clearer queue grouping between fresh executable rows and stale legacy rows, and operator-facing explanations for why a row needs reapproval or is excluded from execution.

## Scope
- Add a dedicated CLI command to surface stale approvals and suggest the exact safe refresh path.
- Group approval queue items into fresh actionable approvals vs stale/reapproval-needed rows in structured summary and reporting outputs.
- Expand operator-facing explanations so stale/excluded rows say why they are blocked and what to do next.
- Keep all approval safety explicit: no auto-approval, no silent row mutation, no bypass of latest-row-only approval rules.

## Non-goals
- No automatic reapproval or mutation of stale rows.
- No changes to broker submission authority.
- No hidden regeneration of proposals.

## Deliverables
1. `scripts/trade.js`
   - add `refresh-stale-approvals` command
   - return JSON and human-readable guidance
2. `src/execution/portfolioHealth.js` / `src/execution/tradeState.js`
   - shared stale-approval inventory / explanation helpers
3. `src/reporting/summaryArtifacts.js` and related reporting surfaces
   - grouped approval queue summary
   - stale-vs-fresh approval counts and explanation text
4. Focused regression coverage
   - stale approval refresh command
   - grouped approval queue contract
   - operator explanation contract

## Verification
- focused approval UX tests pass
- `scripts/test-trade-cli-surface.js` updated and passing
- reporting/summary contract tests updated and passing
- `npm run verify` passes

## Safety gates
- command is diagnostic / guidance only
- recommended actions must point to existing safe repo commands or explicit operator steps
- stale rows remain stale until operator regenerates and approves the latest row
