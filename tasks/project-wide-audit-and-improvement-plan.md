# Project-wide audit and improvement plan

- Status: active
- Last updated: 2026-05-30

## Goal
Audit the entire project from engineering, QA, support, docs, operations, product, reliability, OpenClaw/skill-power-user, and Spitex domain perspectives; identify hard-coded/problematic patterns, dead code, reliability gaps, feature opportunities, and documentation/spec improvements; consolidate the findings into a clear improvement plan ready for implementation.

## Success criteria
- Produce a grounded audit with concrete evidence from the codebase and docs.
- Surface risky hard-coded/problematic patterns and fix the highest-confidence issues that are safe to change autonomously.
- Produce clean documentation/specs describing what is implemented today and what should improve next.
- Produce a phased improvement plan that is specific enough to begin implementing.

## Constraints
- Prefer source/docs/tests changes over generated artifact churn unless directly relevant.
- Ask before destructive or irreversible changes.
- Live broker/write behavior stays safety-first.

## Progress
- 2026-05-30: Created harvester for the project-wide audit and improvement pass.
- 2026-05-30: Gathered code-heavy audit findings across engineering, QA, operations, product, support, documentation, OpenClaw/config, and Spitex-domain-transfer perspectives.
- 2026-05-30: Applied safe cleanup fixes: removed stale Mailgun test naming drift, replaced fixed `/tmp/answers.json` package-script usage with a unique-temp wrapper script, and reconciled report-delivery policy notes with actual configured recipient posture.
- 2026-05-30: Wrote `docs/project-audit-2026-05-30.md` and `docs/project-improvement-roadmap.md` to capture implemented state, risks, opportunities, removal candidates, and an implementation-ready roadmap.
- 2026-05-30: Closed the reporting/accounting/quote hardening lane in git (`67229ae`, `dc1eb42`) and reconciled open-work tracking so the remaining autonomous work now points at the roadmap hardening phases.

## Next
1. Start implementing Phase 2 (configuration and environment hardening): central config matrix, pure env-read helper, and loopback-only TLS-relaxation guard coverage.
2. Then implement Phase 4 (test governance): domain coverage accounting for the default verification gate and externalized lane/quarantine policy.
3. Then implement Phase 7 (cron health / guided-remediation realism): surface cron-fetch degradation explicitly and add a cron-health self-check lane.
4. Then implement Phase 5 (artifact hygiene and dead-code retirement).
