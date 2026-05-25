# Phase 160 — Investor-Friendly Health Report Redesign Plan

## Objectives
- Redesign the health report surfaces for a casual, non-technical investor audience.
- Keep the management summary and operator next step at the top.
- Make healthy states minimal and reassuring.
- Preserve automatic remediation behavior while making unresolved issues clearer and more action-oriented.
- Maintain backward-compatible delivery/reporting contracts where practical, especially subject lines and machine-readable JSON.

## Risks / Dependencies
- Existing tests and downstream tools may depend on current section names or ordering in markdown/HTML output.
- The health report currently serves both investor-facing and operator-facing needs; over-simplifying may hide useful operational context.
- Generated artifact snapshots may drift during full-suite verification and must be cleaned before committing.
- Delivery posture and broker-readiness diagnostics come from existing subsystems; this phase should reframe them, not redefine their source semantics.

## Actionable Checklist
- [ ] Audit current health report renderer and tests to identify stable contracts vs investor-facing copy/layout that can change.
- [ ] Add/extend tests for healthy/minimal states, issue-heavy states, management summary placement, auto-remediation messaging, and operator guidance.
- [ ] Refactor `src/reporting/healthReport.js` to produce a more concise investor-facing narrative in HTML/Markdown while retaining structured JSON detail.
- [ ] Ensure unresolved issues recommend practical next steps after automatic fixes are attempted.
- [ ] Run focused health/reporting tests continuously until green.
- [ ] Run the full test suite, clean unrelated generated churn, commit, and push the completed phase.

## Acceptance Criteria
- Health report HTML/Markdown starts with a concise management summary and clear next step.
- Healthy reports read as minimal/reassuring rather than operationally noisy.
- Issue states clearly distinguish what was auto-remediated from what still needs operator attention.
- Existing machine-readable report generation remains intact.
- Focused health/reporting tests pass, followed by a successful full `npm test` run with no regressions.
