# Phase R3 plan — dashboard queue cleanup + post-SEC0 target policy

## Objectives
1. Clean stale dashboard/operator-queue signals so current live state is summarized fairly.
2. Replace the temporary snapshot-rebased targets with a cleaner strategic target policy that reflects current holdings while preserving future intent.

## Risks
- Accidentally masking real execution blockers while pruning stale queue items.
- Overwriting portfolio intent with a pure snapshot instead of a usable policy.
- Touching execution/reporting logic without verifying against current basket/runtime artifacts.

## Checklist
- [ ] Inspect how dashboard/operator queue derives stale execution_block and in-flight items.
- [ ] Adjust queue/rendering logic to suppress or age out stale historical items when live broker state contradicts them.
- [ ] Verify dashboard regeneration against current live holdings/runtime artifacts.
- [ ] Revise portfolio targets from exact snapshot-lock to a cleaner strategic policy anchored to the current six-holding reality.
- [ ] Inspect resulting markdown/dashboard output.

## Acceptance
- Dashboard no longer presents obviously stale contract-resolution failures as the primary next action after successful fills.
- In-flight execution status reflects current reconciled broker state.
- portfolio/etf/portfolio.md has readable strategic targets consistent with the current six-holding portfolio rather than a brittle exact snapshot clone.
