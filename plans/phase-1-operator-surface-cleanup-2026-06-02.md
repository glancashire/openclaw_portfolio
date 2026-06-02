# Phase 1 - Operator surface cleanup and dashboard path cleanup

Date: 2026-06-02
Status: planned

## Objectives
- Retire the orphan dashboard-email helper trio from the active `scripts/` surface without losing the historical code.
- Define the canonical reporting/operator command surface for dashboard, digest, and report workflows.
- Tighten operator docs so day-to-day commands, expected artifacts, and human-vs-JSON output contracts are explicit.

## Risks / dependencies
- The three legacy helper scripts are currently untracked local files; removal from `scripts/` should preserve them in an archive location rather than delete them outright.
- Existing execution-doc contract tests must remain green.
- Reporting docs must reflect the current renderer reality: `scripts/send-dashboard-digest.js` uses the redesigned report-email path, not the older `dashboardDigest.js` path.

## Actionable checklist
- [ ] Move `send-portfolio-dashboard-email.js`, `check-cash-influx-and-send-dashboard.js`, and `check-eod-transactions-and-send-dashboard.js` out of the active `scripts/` surface into an archive bucket.
- [ ] Add a canonical `docs/reporting-command-surface.md` for supported reporting/email/dashboard commands.
- [ ] Update `docs/operator-runbooks.md` with a shorter golden path and explicit expected artifacts.
- [ ] Update digest docs (`docs/email-digest.md`, `docs/setup/daily-digest.md`) to match the current three-block report-email path.
- [ ] Update repo-map / current-plan references to the new reporting command surface and retired helper decision.
- [ ] Add regression coverage for the new reporting command surface doc and any strengthened operator-runbook contract.
- [ ] Regenerate discovered test metadata if a new `scripts/test-*.js` file is added.
- [ ] Run targeted doc-contract tests plus `npm test` before closeout.

## Acceptance criteria
- No active script surface presents the retired dashboard helper trio as supported tooling.
- The repo has one clear reporting command surface doc covering commands, output shape, and expected artifacts.
- Operator docs no longer require guesswork about whether a command emits JSON, human text, artifacts, or email.
- New and existing doc-contract tests pass.
- `npm test` passes.
