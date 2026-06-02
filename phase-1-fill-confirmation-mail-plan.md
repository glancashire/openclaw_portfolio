# Phase 1 — Fill Confirmation Mail Hardening

Date: 2026-06-02
Status: planned
Depends on: `fill-confirmation-mail-improvement-plan.md`

## Objectives
- Stop investor-facing fill emails from using zero-placeholder portfolio data.
- Build fill emails from a trusted post-fill context with real portfolio totals, cash, holdings, instrument name, and resulting position size.
- Remove low-signal sections and empty-state wording from the investor-facing fill email.
- Make purchase summary rows conditional so duplicate cost rows do not repeat.

## Risks / Dependencies
- `src/execution/basketLifecycle.js` currently emits a fill email before holdings resync; changing that flow must not break reconciliation.
- `scripts/monitor-fills.js` has better live context but currently uses weak name enrichment (`name: ''`).
- Tests currently encode the old mail structure (`Execution detail`, always-on open orders, generic copy) and will need to move with the new contract.
- The repo is dirty; stage only files directly related to this phase.

## Checklist
- [ ] Remove or disable the investor-facing zero-placeholder send path in `src/execution/basketLifecycle.js`.
- [ ] Introduce a normalized post-fill context builder used by `lib/tradeExecutionNotifier.js` / `lib/tradeNotificationEmail.js`.
- [ ] Enrich fill mail context with instrument name and resulting total held from holdings / approved instrument metadata.
- [ ] Rewrite the fill email HTML/text renderer to:
  - [ ] omit `Execution detail`
  - [ ] omit remaining-open-order sections when none remain
  - [ ] hide duplicate commission-inclusive cost row when identical
  - [ ] replace generic `What changed` text with real post-fill facts
  - [ ] make metric tiles uniform and tidier
- [ ] Add/update unit, integration, and regression tests for the new contract.
- [ ] Generate a local preview using realistic post-fill sample data.

## Acceptance Criteria
- No investor-facing fill email path can send `totalValueChf: 0`, `cashChf: 0`, `holdings: []` as live context.
- A normal live fill email shows a real instrument name, real portfolio value, real cash balance, and real resulting total held.
- Empty open-order copy is absent when there are no open orders.
- `Execution detail` no longer appears in investor-facing fill email HTML/text.
- `Cost in CHF including commission` appears only when it differs materially from total cost.
- Updated fill-email test suite passes.
