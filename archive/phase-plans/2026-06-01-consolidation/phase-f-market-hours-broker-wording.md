# Phase F — Market-hours broker wording cleanup

## Objective
Make dashboard/reporting wording distinguish between genuine broker readiness problems and expected off-session / market-closed posture, so the dashboard reads cleanly when IBKR is reachable but live quotes are unavailable because the market is closed.

## Risks / dependencies
- Must not weaken live-execution safety gates.
- Must not relabel true auth/socket failures as healthy.
- Should preserve delayed-only posture as non-live for execution decisions while reducing misleading incident wording.

## Action checklist
- [ ] Inspect broker readiness summarization and downstream dashboard wording.
- [ ] Introduce cleaner market-hours-aware messaging for delayed-only posture.
- [ ] Update dashboard/recommendation strings that currently imply outage when posture is expected/off-session.
- [ ] Add/extend focused tests for delayed-only wording.
- [ ] Regenerate the dashboard and inspect the rendered summary text.
- [ ] Run focused tests plus curated verification if needed.

## Acceptance criteria
- Dashboard no longer says IBKR is "not ready" when the posture is reachable/authenticated but delayed-only / off-session.
- Guidance still blocks or cautions live execution appropriately.
- Auth/socket failure wording remains clearly degraded.
- Focused tests pass.
