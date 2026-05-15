# Phase 169 — Health report generator and self-heal engine

## Goal
Create a health-monitoring surface that inspects the key portfolio system components, attempts safe/directly-fixable remediations automatically, and produces a beautiful highlighted health email report for any remaining issues.

## Scope
- Define a health check runner that gathers key system signals:
  - broker readiness
  - broker automation pause/error state
  - report/delivery readiness
  - stale approvals
  - queued retry/open-runner backlog
  - fill-notification backlog
  - generated-state validation
- Define a safe self-heal engine for directly-fixable issues only.
- Generate a structured health-report artifact plus beautiful HTML email rendering.
- Add a CLI entry point that runs health checks, attempts safe fixes, regenerates report artifacts if needed, and optionally sends the health email through the canonical delivery path.
- Add focused tests for healthy/degraded cases and self-heal behavior.

## Self-heal guardrails
- Only directly-fixable, low-risk, local/reporting/runtime hygiene issues may be auto-remediated.
- Do not place trades, alter broker positions, or clear broker error pauses automatically.
- Do not hide unresolved issues; highlight them in the health email after remediation attempts.
- Keep all output auditable.

## Likely directly-fixable candidates
- Regenerate dashboard/summary/overview artifacts when stale/missing.
- Rebuild generated-state/reporting artifacts.
- Re-run read-only delivery/report readiness surfaces.
- Normalize runtime/report artifacts when the fix is purely local and deterministic.

## Verification plan
- Add focused health-runner/self-heal/email-rendering tests.
- Re-run existing health/report/delivery regressions.
- Run one real health-check CLI flow under live email policy and confirm provider acceptance if the implementation reaches that stage safely.
