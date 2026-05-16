# Phase 171 — Health-report prioritization and email clarity

## Goal
Improve the health-report flow so it not only reports issues clearly, but also makes them easier to act on: fix directly-fixable report issues where safe, restructure the health email/dashboard for much clearer priority ordering, and make the rendered output visually cleaner and easier to scan.

## Scope
- Expand the health-report follow-up plan to explicitly address fixing discovered report issues where the fix is local, deterministic, and safe.
- Simplify the health email/dashboard structure so the most important information appears first.
- Move exceptions, blockers, and recommended next actions to the top of the rendered health email/dashboard.
- Move lower-priority status/reference sections toward the end of the email/dashboard.
- Improve the visual design of the health email/dashboard so it is easier to scan on desktop and mobile.
- Preserve policy-gated delivery behavior and plain-text fallbacks.
- Add focused tests for priority ordering, exception-first rendering, and safe issue-fix reporting.

## Design goals
- Lead with: overall health, active blockers/exceptions, what changed, and the next action.
- Follow with: self-heal results and unresolved issues.
- End with: detailed status/reference sections and lower-priority diagnostics.
- Make the difference between fixed issues, remaining issues, and informational status visually obvious.
- Keep the design compact, professional, and readable rather than decorative.

## Safe-fix guardrails
- Only fix local/reporting/layout/data-freshness issues that are deterministic and auditable.
- Do not hide unresolved broker, execution, delivery-policy, or approval blockers.
- Do not weaken any approval, execution, or scheduling safety controls.
- Any issue fixed during the health run must remain visible in the output as fixed/remediated evidence.

## Verification plan
- Add focused tests for section ordering and exception-first rendering.
- Add focused tests that verify fixed issues are shown separately from unresolved issues.
- Re-run health/report/email regressions until green.
- Run one real health-report email flow under live policy once the redesign lands safely.
