# Phase 209 Plan — health email v2

## Objectives
- Upgrade the health report/email layout to foreground Phase 208 structured self-heal results.
- Add explicit operator guidance with concrete command strings where applicable.
- Add simple trend reporting from recent observability events so repeated failures are visible in email.
- Preserve the existing `run-health-check --send-email` path while improving the content it sends.

## Risks / Dependencies
- Trend data depends on the new observability JSONL log; rendering must degrade gracefully when the log is sparse or missing.
- Operator guidance must stay safe and concrete without implying unsupported auto-fixes.
- Existing health-report tests are broad; new sections should be added without destabilizing the rest of the report contract.

## Actionable Checklist
- [ ] Add recent-trend summarization from observability events.
- [ ] Extend report data shaping with concrete operator command suggestions for open issues and healed items.
- [ ] Update HTML/markdown rendering with "Issues auto-healed", "Open issues for operator", and "Trends" sections.
- [ ] Add/adjust focused tests for report rendering and health-check CLI/email path behavior.
- [ ] Run focused tests, then full repo verification.
- [ ] Commit implementation and push.

## Acceptance Criteria
- Health reports include auto-healed issues, operator-only open issues, and recent trend summaries.
- Trend rendering works with both empty and populated observability logs.
- `scripts/run-health-check.js --send-email` uses the upgraded layout without breaking delivery behavior.
- Focused health-report tests pass and full `npm test` passes.
