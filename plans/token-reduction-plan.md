# Token Reduction Plan

## Goal
Reduce token usage in reporting/model paths without changing user-facing correctness.

## Implemented
- Lowered default model token budget in `lib/modelClient.js` from 400 to 256.
- Added `--max-tokens` forwarding for the openclaw CLI provider.
- Added `src/reporting/promptBudget.js` for future compact-prompt helpers.
- Simplified report generation to a compact single-source narrative path and preserved required sections.

## Verification
- `npm run test:repo` — passed except for reporting completeness on the first attempt, then fixed.
- `node -c lib/modelClient.js`
- `node -c src/reporting/reportGenerator.js`
- `node -c src/reporting/reportEmail.js`

## Notes
- Full-detail artifacts remain on disk, but report text is now more compact.
- Next best follow-up would be to thread the new prompt-budget helper into any remaining model-callers.
