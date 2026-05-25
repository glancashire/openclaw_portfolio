# Phase 207 Plan — HTML email digest

## Objectives
- Add a dedicated digest CLI for daily/weekly portfolio email delivery.
- Reuse existing reporting/email primitives instead of creating a parallel formatter.
- Support `MAILGUN_RECIPIENT` as the default/fallback outbound recipient source for digest delivery.
- Cover subject, rendering, and delivery-path behavior with focused tests.

## Risks / Dependencies
- Existing delivery policy may still declare local-only or missing recipients; digest delivery must fail clearly, not silently.
- Current report surfaces are large and partially artifact-driven; digest generation should avoid depending on brittle generated runtime files beyond summary artifacts.
- Repo has many mutable runtime artifacts; commits must avoid sweeping unrelated generated-file churn.

## Actionable Checklist
- [ ] Inspect and reuse the current email delivery/reporting pipeline.
- [ ] Add recipient fallback support using `MAILGUN_RECIPIENT` when policy recipients are absent.
- [ ] Implement digest subject/body builders for daily and weekly variants.
- [ ] Add `scripts/send-dashboard-digest.js` with `--portfolio` and `--frequency` parsing.
- [ ] Add focused unit/integration tests for subject text, HTML sections, fallback recipient behavior, and CLI delivery path.
- [ ] Run focused tests, then the repo verification gate if feasible.
- [ ] Commit implementation and push.

## Acceptance Criteria
- `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run` emits a valid digest payload/artifact summary without sending mail.
- `--frequency=weekly` uses the weekly digest subject contract.
- Digest HTML includes KPI summary, allocation drift, instrument health, cron health, and recent/pending operational context.
- Email delivery can resolve recipients from policy or `MAILGUN_RECIPIENT` fallback.
- Focused digest/reporting tests pass, and repo verification passes or any blocker is explicitly called out.
