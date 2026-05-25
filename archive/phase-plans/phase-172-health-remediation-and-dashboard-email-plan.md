# Phase 172 — Health remediation + dashboard email clarity plan

## Goal

Address health problems surfaced by the current health check where they are safely fixable in-repo, and improve the dashboard/report email so operators immediately see:

- the top live blocker
- the single next action
- what is already remediated
- what still needs human intervention

## Current health reality

The current live health report for `portfolio/etf` is blocked by:

- `broker_unready`

This is an operational dependency, not a purely in-repo bug. The code should therefore:

- surface that limitation more clearly
- distinguish runtime/operator recovery from code-fixable issues
- avoid burying the top blocker inside long status sections

## Scope

### In scope

- improve health classification wording for operational vs fixable issues
- improve dashboard ordering and scanability
- improve report email ordering and scanability
- surface the top blocker and next action more prominently
- separate remediated items from unresolved items
- make operator queue and broker block context easier to scan
- add focused tests for new ordering and wording

### Out of scope

- pretending to fix unavailable IBKR connectivity in code
- changing live execution safety gates
- changing ETF-only / CHF-first MVP constraints

## Implementation steps

1. Add a Phase 172 checklist.
2. Improve health-report/dashboard wording so operational blockers read clearly.
3. Restructure dashboard output to lead with immediate status, top blocker, and top operator action.
4. Restructure report email to lead with blocker + next action + delivery posture summary.
5. Add focused tests for exception-first dashboard/email layout.
6. Re-run the relevant reporting regressions.
7. Run one live health-check email flow as evidence.

## Verification gates

- `node scripts/test-email-html-rendering.js`
- `node scripts/test-dashboard-command-center.js`
- `node scripts/test-dashboard-report-freshness.js`
- `node scripts/test-health-report-priority-order.js`
- `node scripts/test-health-report-runner.js`
- `node scripts/test-health-check-cli.js`
- `node scripts/run-health-check.js /home/ubuntu/.openclaw/workspace/portfolio/etf --send-email`

## Success criteria

- top blocker appears near the top of dashboard/report email output
- next operator action appears near the top
- dashboard makes operator queue clearer
- email is more useful as a quick operational briefing
- all focused regressions pass
