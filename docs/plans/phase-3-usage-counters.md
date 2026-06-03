# Phase 3 — Usage and decision-support reporting

Date: 2026-06-03
Status: ACTIVE
Source: `CURRENT_PLAN.md` Phase 3

## Objectives

Close the three open items:

1. Add usage counters for report sends, failures, approval latency, readiness failures, broker degradation, and reconciliation lag.
2. Add trend and KPI summaries to overview artifacts.
3. Decide which metrics are operator-facing only and which belong in investor-facing outputs.

## Decision up front (high-confidence)

**Operator-facing only, not investor-facing:** report-send counters, delivery
failure counters, approval latency, readiness failures, broker degradation,
reconciliation lag.

Rationale: these are operational health signals. Investors don't need to see them;
they need value/cash/allocation/PnL and a short narrative. We will surface KPIs
in `runtime/overview/*` artifacts and the daily digest's "Operations" card.
The investor-weekly/monthly emails stay focused on portfolio outcomes.

## Architecture

Introduce a single counters store:

- `runtime/overview/usage-counters.json` — schema-versioned, append-only-style
  rolling counters (last-7-days, last-30-days, lifetime) plus `lastFooAt` timestamps.
- A small library `src/reporting/usageCounters.js` with:
  - `recordEvent({ kind, ts, ...details })`
  - `readSnapshot()` — returns the rolling counters and recent events
  - `summarizeForDashboard(snapshot)` — returns labels + values fit for `metricGrid`
- A new `scripts/regenerate-usage-counters.js` to rebuild the snapshot from
  evidence already on disk (delivery-status, report-history, approvals-queue,
  ibkr-accounting timestamps), so we get useful data without retroactively
  instrumenting every code path.

Then wire the snapshot into:

- `runtime/overview/usage-kpi.{json,md,html}` — new artifact set
- `src/reporting/dashboardDigest.js` — adds an "Operations KPI" card

## Counter set

| Counter | Source | Window |
|---|---|---|
| Report sends | `runtime/overview/report-history.json` | rolling 7/30 |
| Delivery failures | `runtime/overview/delivery-status.json` (when `ready=false`) | rolling 7/30 |
| Approval latency (median, p90) | `runtime/overview/approvals-queue.json` (`createdAt`/`approvedAt` if present) | last 7 days of approvals |
| Readiness failures | `runtime/last-ibkr-readiness.json` if present + delivery-status | rolling 7/30 |
| Broker degradation events | `runtime/last-broker-degradation.json` if present + delivery-status `brokerAutomationPaused` | rolling 7/30 |
| Reconciliation lag (days since latest reconcile) | `runtime/ibkr-accounting/<portfolio>/latest.json` mtime | snapshot |

When a source isn't present, the counter records `unavailable` rather than zero,
so we don't pretend things are healthy when we can't measure.

## Risks

- **Garbage-in counters.** If source artifacts have inconsistent schemas, we
  produce misleading numbers. Mitigation: schema validation in the regenerate
  script, `unavailable` fallthrough, regression tests on synthetic fixtures.
- **Performance.** A regenerate that scans deeply on every dashboard run could
  slow the digest. Mitigation: regenerate on a separate cadence (cron or
  manual), cache result on disk; dashboard reads cached file.
- **Confusing investors.** Mitigation: KPI block is operator-facing only; do
  NOT add it to weekly/monthly investor templates.

## Actionable checklist

- [ ] Create `src/reporting/usageCounters.js` with the read/summarize API.
- [ ] Create `scripts/regenerate-usage-counters.js` that scans evidence and
      writes `runtime/overview/usage-counters.json`.
- [ ] Add `runtime/overview/usage-kpi.{json,md,html}` generator (small module
      under `src/reporting/usageKpiArtifact.js`).
- [ ] Wire a compact "Operations KPI" card into `dashboardDigest.js`
      (operator-facing daily digest only).
- [ ] Add tests:
  - Unit: `scripts/test-usage-counters.js` covering schema, rolling windows,
    `unavailable` fallthrough, edge cases (zero events, missing fields).
  - Integration: `scripts/test-usage-kpi-artifact.js` covering the
    JSON/MD/HTML triplet generation from a synthetic fixture.
  - Regression: `scripts/test-dashboard-digest-kpi-card.js` asserting the
    KPI card renders into the digest HTML when counters are present and
    is absent when no counters file exists.
- [ ] Update `docs/reporting-command-surface.md` with the new artifact + script.
- [ ] Update `playbook.md` "Console helpers" with the regenerate command.
- [ ] Update `CURRENT_PLAN.md` Phase 3 to mark items closed.

## Acceptance criteria

- All new tests pass; existing `npm test` and `npm run test:safe` stay green.
- `node scripts/regenerate-usage-counters.js` produces a valid
  `runtime/overview/usage-counters.json` from current evidence on this host.
- `runtime/overview/usage-kpi.json` exists alongside an MD/HTML render.
- The daily digest HTML includes an Operations KPI card when counters
  are present, and renders cleanly without it when absent.
- No investor-facing artifact (weekly/monthly) gains any new counter.
- `docs/reporting-command-surface.md` and `playbook.md` document the
  regenerate command.
