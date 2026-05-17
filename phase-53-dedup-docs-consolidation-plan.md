# Phase 53 — Deduplication and docs consolidation

## Goal
Reduce obvious duplicated logic and keep operator docs clear, current, and non-ambiguous.

## Current hypothesis
This phase may already be mostly complete, with only stale checklist noise left.

## In scope
- scan the core source and script surfaces for obvious duplication or hard-coded logic
- verify the operator docs remain consolidated and clear
- tighten or add tests only if a real duplicate surface or doc ambiguity remains

## Out of scope
- risky broad refactors
- changing execution policy
- deleting compatibility paths without a clear canonical replacement

## Implementation steps
1. Inspect the likely duplicate/hard-coded execution surfaces.
2. Review the active docs set for obvious stale/duplicate operator guidance.
3. Patch only if a real duplication or ambiguity remains.
4. Re-run focused verification until green.
5. Commit and push completion.

## Verification gates
- `node tests/test-tradeState.js`
- `node tests/test-portfolioExecution.js`
- `node scripts/test-market-open-trade-row-selection.js`
- `node scripts/test-trading-guards.js`
- `node scripts/test-writable-live-lane-acceptance.js`

## Success criteria
- duplicated core logic is reduced safely
- docs are clearer and smaller
- no tested behavior regresses
