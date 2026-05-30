# Open phase autonomous closeout

- Status: active
- Last updated: 2026-05-30
- Owner: bb8

## Instructions

Goal: reconcile stale phase-overview documentation with actual git state, render a clear dashboard card for Graham, and continue autonomous implementation/verification for the real remaining open execution-hardening phases.

Success criteria:
- A current dashboard/overview artifact exists and reflects git truth, not stale docs.
- The remaining real open phase(s) are planned, verified, completed, committed, and pushed.
- Phase docs/overview are updated to reflect reality.
- Full verification evidence is captured where feasible.
- Open decisions are surfaced early, not buried at the end.

Constraints:
- Do not disturb Graham-owned WIP.
- Do not commit generated runtime/report artifacts unless the phase explicitly targets them.
- Work around the dirty working tree safely.
- Do not run trade/approval scripts while working open-phase closeout.

## Progress

- 2026-05-30: User requested a visual dashboard card plus autonomous continuation through remaining phases.
- 2026-05-30: Loaded combine-harvester skill because this is a long, multi-phase, resumable task.
- 2026-05-30: Discovered repo working tree is dirty with many generated/runtime artifacts unrelated to the requested phase work.
- 2026-05-30: Grounded phase truth against git history instead of stale overview docs.
- 2026-05-30: Verified from git that R6 is already complete and pushed (`5dc2723`/`b72519f` lineage), next-1 has implementation commit (`8f0dfce`), next-2 has implementation commit (`b398c85`), and phase 5 has implementation commit (`2159330`).
- 2026-05-30: Determined the main likely remaining technical closeout is next-3 verification/completion plus documentation reconciliation.
- 2026-05-30: Built a fresh HTML dashboard artifact from git truth for Control UI/web embedding.
- 2026-05-30: Focused phase verification passed (`test-order-preparation`, `test-submit-open-uses-approved-primary-exchange`, `test-execution-diagnostics-helper`, `test-target-gap-deployment`, `test-sync-probable-cancelled-requires-strong-match`, `test-basket-terminal-evidence-fallback`).
- 2026-05-30: Safe-lane rerun surfaced an unrelated real regression in `basketReproposalBuilder` (`ReferenceError: previousLimit before initialization`). Fixed by moving `previousLimit` initialization ahead of its first use.
- 2026-05-30: Rewrote `OPEN_PHASES_OVERVIEW.md` and `PHASE_OVERVIEW.md` to reflect actual git truth instead of stale open-phase assumptions.
- 2026-05-30: Added the open-phases dashboard card to the overview reporting pipeline, added tests, passed safe lane, and pushed `ca34ead`.
- 2026-05-30: User requested native IBKR gateway recovery first, then autonomous phase execution. Started `/home/ubuntu/ibgateway-native/start-ibc.sh`; IBC reached the `Second Factor Authentication` dialog successfully on display `:99`, so the launcher path is healthy but final readiness is waiting on login/2FA completion before port `127.0.0.1:4001` opens.
- 2026-05-30: Surfaced early decision to keep source/docs/tests-only commits unless a phase explicitly targets generated artifacts; proceeding on that basis.

## Next

1. Phase A: reconcile residual stale-open references and define the canonical remaining-open-work source.
2. Commit the Phase A plan before implementation.
3. Implement/tests/verify/commit/push Phase A.
4. Continue into Spec §1 roll-up closure and decision-package phases.
5. Recheck IBKR readiness after the operator completes second-factor approval on `:99`.

## Current status
- Phase E safe-lane timeout hardening is complete: the issue was manifest lane misclassification, not a product regression.
- Reclassified heavy reporting/fixture tests from `safe` to `integration` in `scripts/discover-test-suites.js`, regenerated `docs/operations/test-manifest.json`, and revalidated the lane contract.
- Verification after the fix is green:
  - `node scripts/test-test-manifest-shape.js`
  - `npm run test:all -- --lane=safe` → 219 passed, 0 failed, 3 quarantined
  - `npm test` / `node scripts/verify-repo.js` → green
- Remaining non-code open items are external/operator or parked-WIP: Mailgun infra activation, direct editable Control UI repo discovery, and Graham-owned FX cash reconciliation.

