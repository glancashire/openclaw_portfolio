# Phase 217 — deterministic resting state after verification

## Objectives
- Eliminate or control the post-verification re-dirtying of versioned evidence files so the repo can remain in a stable resting state after a successful validation pass.
- Determine which verification paths rewrite committed evidence and whether they should write in place, write conditionally, or support a read-only validation mode.
- Preserve truthful evidence generation while reducing unnecessary churn from idempotent or non-semantic rewrites.

## Risks / dependencies
- Some tests intentionally regenerate artifacts as part of contract verification; changing write behavior could weaken coverage if done carelessly.
- Versioned evidence files are operator-facing outputs, so suppressing legitimate updates would be worse than leaving harmless churn.
- The problem may involve normalization differences (timestamps, ordering, formatting) across multiple generators.

## Actionable checklist
- [ ] Diff the post-commit dirty evidence set and classify whether each change is semantic or rewrite-only churn.
- [ ] Trace which verification/test scripts rewrite those artifacts during `node scripts/verify-repo.js`.
- [ ] Introduce the smallest safe change to keep verification idempotent at rest (conditional writes, dry-run validation mode, or deterministic serialization).
- [ ] Add regression coverage proving a successful verification pass does not re-dirty versioned evidence beyond explicitly ephemeral runtime files.
- [ ] Re-run focused tests and full verification, then commit and push the fix.

## Acceptance criteria
- After a successful verification pass, versioned evidence files remain clean unless their content truly changed.
- Any remaining dirty files are limited to intentionally ephemeral runtime churn or explicitly documented exceptions.
- Regression tests cover the idempotent resting-state behavior.
- Full repository verification passes after the fix.
