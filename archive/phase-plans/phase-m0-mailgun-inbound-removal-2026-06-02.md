# Phase M0 - Mailgun inbound removal and surface scrub

Date: 2026-06-02
Status: complete
Completed: 2026-06-02

## Objectives
- Remove the unused Mailgun inbound approval/webhook surface from the live repo.
- Scrub Mailgun inbound references from current plans, status docs, setup docs, and verification surfaces.
- Preserve historical references only inside archive/memory material where they remain historical context.

## Risks / dependencies
- `npm test` must stay green after deleting the inbound module and its test.
- Repo-check surfaces must stop referencing deleted files.
- Outbound Mailgun transport must remain untouched; only inbound webhook handling is in scope.
- Historical archive docs should not be broadly rewritten.

## Actionable checklist
- [ ] Delete `lib/mailgunInbound.js` and `scripts/test-mailgun-inbound.js`.
- [ ] Delete the live setup docs for Mailgun inbound.
- [ ] Remove Mailgun inbound references from `CURRENT_PLAN.md`, `STATUS.md`, and `docs/operations/repo-map.md`.
- [ ] Remove deleted-test references from discovery / verification surfaces.
- [ ] Regenerate `docs/operations/test-manifest.json` and `docs/operations/test-coverage-by-domain.json`.
- [ ] Verify plan/doc truth and repo cleanliness gates.
- [ ] Run `npm test` before phase closeout.

## Acceptance criteria
- No live code or current docs reference Mailgun inbound.
- Outbound email/report delivery remains intact.
- Historical references remain only in archive/memory context.
- `npm test`, `node scripts/test-plan-doc-truth.js`, `node scripts/test-open-phases-card.js`, and `node scripts/test-repo-root-cleanliness.js` pass.
