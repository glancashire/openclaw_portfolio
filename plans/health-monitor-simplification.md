# Plan: Simplify OpenClaw Health Monitor email

**Created:** 2026-06-04
**Author:** bb8
**Trigger:** Graham — health email is "not entirely useful and understandable at a glance"; contains contradictions like "degraded / low" + "Action required" + "No immediate operator action is required" all in the same message
**Owner:** main session
**Status:** plan — awaiting Graham's approval

---

## 1. Symptoms (from the email Graham received)

The email had:
- Status badge: **degraded / low**
- A second badge: **Action required**
- Management-summary body: **"No immediate operator action is required."**
- "Issues still needing attention: **1**"
- Body of "What matters now": **"5 in-flight execution row(s) need reconciliation"**
- Body of "Next action": **"No immediate operator action is required."**
- Trends: **"Watching. … No hard blocker, but recurring signals should not be ignored."**
- Bottom of the same email: **"5 in-flight execution row(s) need reconciliation before overlapping actions."**

So three different parts of the message disagreed about whether there's something to do. That's confusing on its own. On top of that, **even when this report has nothing actionable, it still gets sent**, which trains the operator to ignore it. Graham's preference is the opposite: **"only sent if there are issues you cannot autofix."**

## 2. Root causes (in code)

### 2a. The conflicting wording comes from two independent decisions

In `src/execution/portfolioHealth.js`:

```js
let severity = 'low';
if (brokerErrorState) { severity = 'high'; recommendedActions.push(...) }
if (somethingMedium) { if (severity === 'low') severity = 'medium'; recommendedActions.push(...) }
…
return {
  severity,
  blockerCount: blockers.length,
  recommendedActions: Array.from(new Set(recommendedActions)),
  nextAction: recommendedActions[0] || 'No immediate operator action is required.',
};
```

In `src/reporting/healthReport.js`:

```js
const nextActionBadge = badge({
  label: blockers.length ? 'Action required' : 'Everything important looks healthy',
  tone: blockers.length ? 'danger' : 'success',
});
```

So **the badge** uses `blockers.length`, but **the body** uses `recommendedActions[0] || "No immediate operator action is required."`. When `blockers.length === 0` but `recommendedActions` is empty *and* the email is being sent because the trend or in-flight count flagged something else, the two paths disagree. That's the contradiction Graham saw.

### 2b. Suppression in `run-health-check.js` only catches truly green reports

```js
if (severity === 'none' || healthStatus === 'healthy' ||
    (report.health?.blockerCount === 0 && severity !== 'high' && severity !== 'critical')) {
  emailDelivery = { attempted: false, sent: false, reason: 'suppressed_green_health' };
}
```

A `degraded/low` report with **no blockers** would have been suppressed by that last clause. The fact that **this one was sent** means either `blockerCount > 0` (despite the body saying "no action required") or `severity` was promoted to `high|medium`. Either way the suppression rule and the body wording are out of sync.

### 2c. No "try to fix it yourself first, then escalate" stage

`runHealthCheck({ applySafeFixes: true })` already applies a fixed list of safe automatic fixes (regenerate dashboard, regenerate reporting artifacts). It does not (currently):
- retry on transient signals (e.g. in-flight execution rows that are normal during/after a basket and resolve on their own next cycle)
- attempt restarts/retries for things like broker connectivity or generated-state issues
- wait one more cycle before escalating

Result: any signal that survives one pass of "regenerate" gets emailed, even if it self-clears on the next cron tick.

---

## 3. Goal

A health email **only fires** when:
1. There is **at least one real problem**
2. That problem **was not fixed** by the autofix pass
3. That problem **persisted across at least two consecutive checks** (i.e. it isn't transient)

When the email does fire, it has **one** status, **one** sentence saying what's wrong, **one** sentence saying what bb8 already tried, and **one** clear next action. No conflicting badges. No "no immediate action required" appearing in a message that's clearly about an issue.

When the system is fine: **no email**. The dashboard and overview pages already carry the green-state info; the email is reserved for things Graham must actually read.

---

## 4. Design

### 4a. Single source of truth for `status` and `next action`

Refactor `evaluateExecutionHealth` (`src/execution/portfolioHealth.js`) so that the output is a single, internally-consistent object:

```js
{
  state: 'healthy' | 'watch' | 'attention' | 'critical',
  summary: string,        // one sentence — what is wrong / right
  nextAction: string|null,// one sentence — what the operator should do; null if nothing
  blockers: [...],
  watchSignals: [...],    // non-blocking concerns
  raw: { ... existing internals ... },
}
```

Rules:
- `state === 'healthy'` ⇒ `nextAction === null`, `summary === 'All systems normal.'`
- `state === 'watch'` ⇒ at least one watch signal, no blocker; `nextAction === null` (bb8 will keep an eye)
- `state === 'attention'` ⇒ ≥1 blocker bb8 could not auto-resolve; `nextAction` is the highest-priority concrete instruction
- `state === 'critical'` ⇒ data-integrity, transmit, or broker safety blocker; `nextAction` non-null

The HTML/markdown generator stops doing independent badge logic. It just reads `state`, `summary`, and `nextAction`.

### 4b. Two-stage autofix → re-check → escalate

In `runHealthCheck`:

1. **Pass 1:** evaluate, apply safe fixes (today's behaviour).
2. **Pass 2:** if anything is still flagged after pass 1, **try a targeted second round** of fixes scoped to the remaining symptoms:
   - In-flight-execution-row backlog → call `node scripts/reconcile-execution-rows.js` (new thin wrapper that already exists logic for via `src/portfolio/execution/reconciliation.js`). If the count drops to 0, problem solved.
   - Stale generated-state → regenerate the affected artifact again.
   - Broker readiness → re-poll `check-interactive-brokers-readiness.js`; if it transitions to ready, problem solved.
3. **Persistence check:** read the most recent prior `health-report.json`. If a signal was present last run *and* this run, it counts as "real". One-shot signals (present this run, absent last run) are tagged `watch` not `attention`.

This is the "try to fix it yourself first" Graham asked for.

### 4c. Email gate: only send when `state ∈ {'attention','critical'}`

Replace the current suppression heuristic in `scripts/run-health-check.js` with a single check on the new `state` field:

```js
const SEND_STATES = new Set(['attention','critical']);
if (!SEND_STATES.has(report.health.state)) {
  emailDelivery = { attempted:false, sent:false, reason:`suppressed_state_${report.health.state}` };
} else { … existing send path … }
```

`watch` reports are written to disk (for trend memory and the dashboard) but not emailed.

### 4d. New email layout

Subject:
- `[Portfolio] ETF attention needed — <one-line summary>` (state=attention)
- `[Portfolio] ETF CRITICAL — <one-line summary>` (state=critical)

Body (markdown, ~10 lines, no badges, no contradicting blocks):

```
ETF portfolio — attention needed
Generated 2026-06-04 08:00 UTC.

What's wrong
  5 in-flight execution rows are still pending reconciliation
  (persisted across 2 consecutive health checks).

What bb8 already tried
  - Regenerated dashboard + summary
  - Re-ran reconciliation pass — 5 rows remained

What to do
  Run: node scripts/reconcile-execution-rows.js portfolio/etf --verbose
  Then re-run the health check.

Full report: <link to runtime/overview/health-report.html>
```

HTML mirrors this structure: one status row, one "what bb8 tried" row, one "what to do" row, link to the persistent HTML report for detail. No "Management summary", "Health direction", "Reference details" — those stay in the on-disk HTML for when Graham wants to drill in.

### 4e. Failure-of-the-failure case

If pass 2 *itself* throws (e.g. the reconcile script crashes), state = `critical` and bb8 includes the underlying error message verbatim in "What bb8 already tried".

---

## 5. Implementation steps (phased, each with tests)

### Phase A — refactor the health verdict
1. Add `state`, `summary` to the return value of `evaluateExecutionHealth`. Keep existing fields (severity, blockerCount, recommendedActions, nextAction) for backward compatibility but mark them deprecated.
2. Compute `state` deterministically from blockers + watchSignals.
3. Update `scripts/test-health-report-priority-order.js` and add a new `scripts/test-health-state-derivation.js` covering: healthy / watch / attention / critical.
4. Verify no existing consumer (dashboard, overview) regresses.

### Phase B — second-pass autofix
1. In `runHealthCheck`, after pass-1 autofix, if `state !== 'healthy'`, call a new `applyTargetedFixes(report)` that maps each remaining symptom to a fix function. Reuse existing scripts where possible; do not invent new live-execution code paths.
2. Targeted fixes whitelist (Tier-safe — *never* placing orders, *never* touching approval state):
   - `regenerate_dashboard`
   - `regenerate_reporting_artifacts`
   - `regenerate_summary_artifacts`
   - `reconcile_inflight_rows` (read-only reconciliation; refuses to act if a basket is mid-execution)
   - `repoll_broker_readiness`
3. Re-evaluate after the targeted pass; carry the diff into the report (`bb8Tried` list).
4. Tests: `scripts/test-health-second-pass.js` — given a synthetic report with one in-flight row, the second-pass fix clears it; given a stuck symptom, the report still escalates.

### Phase C — persistence check
1. After pass-2, load the previous `runtime/overview/health-report.json` (or the per-portfolio sibling). If a blocker present now was also present then, mark as persistent.
2. Use persistence to decide `state`:
   - present now only → `watch`
   - present now and previously → `attention`
3. Test: `scripts/test-health-persistence.js` — given two synthetic reports back-to-back with the same symptom, second one escalates; given alternating symptoms, neither escalates.

### Phase D — new email layout
1. New `buildEscalationEmail(report)` in `src/reporting/healthReport.js` returning `{ subject, text, html }`.
2. Old `buildHealthReportMarkdown` / `buildHealthReportHtml` stay (they back the persistent HTML/MD on disk that the dashboard links to), but get a header banner showing the same `state` value so on-disk and email never contradict.
3. Tests: `scripts/test-health-escalation-email.js` — golden subject + body strings for one attention case and one critical case.

### Phase E — email gate + cron
1. In `scripts/run-health-check.js`, replace the green-suppression heuristic with the `SEND_STATES` check on `report.health.state`.
2. Cron payload for `portfolio-health-monitor-etf` stays the same (still runs `--send-email`); the script decides whether to actually deliver.
3. Doc update in `docs/operations/active-cron-jobs.md` noting the new behaviour ("emails only on `attention` or `critical` state, persisted across 2 checks").

### Phase F — operator visibility for suppressed states
1. Append a 1-line entry per health check to `runtime/overview/health-trend.jsonl` (`{ ts, state, summary }`). This is what trend questions read.
2. The dashboard's existing health badge keeps showing live state. So if you ever want to know "is it watching anything", you look at the dashboard, not your inbox.

---

## 6. Acceptance criteria

1. Running `node scripts/run-health-check.js portfolio/etf --send-email` with a clean state → **no email sent**, exit 0, JSON shows `emailDelivery.reason === 'suppressed_state_healthy'`.
2. Same with a transient single-tick attention symptom (in-flight rows that the second pass clears) → **no email sent**, JSON shows the symptom was resolved in the second pass.
3. Same with a real persistent symptom → **one email sent**, subject contains `attention needed` or `CRITICAL`, body has exactly four blocks (What's wrong / What bb8 already tried / What to do / Full report link), no contradictions, no "no immediate operator action" text anywhere in the message.
4. A second consecutive cron tick with the same unresolved symptom → email **rate-limited** (don't re-email the same persistent symptom every 6 hours; emit on first detection and then every 24h thereafter).
5. All existing health-check unit tests continue to pass; ≥10 new assertions covering the new state derivation; ≥4 new assertions covering second-pass behaviour; ≥4 covering persistence; ≥4 covering the new email layout.

---

## 7. Files affected

| File | Type | Change |
|---|---|---|
| `src/execution/portfolioHealth.js` | edit | add `state`, `summary`; keep legacy fields |
| `src/reporting/healthReport.js` | edit | `runHealthCheck` adds second pass + persistence; new `buildEscalationEmail`; persistent HTML/MD get a status banner |
| `src/reporting/healthFixers.js` | new | targeted-fix dispatch table |
| `scripts/run-health-check.js` | edit | new `SEND_STATES` gate |
| `scripts/reconcile-execution-rows.js` | new (thin wrapper) | re-uses existing `src/portfolio/execution/reconciliation.js` |
| `runtime/overview/health-trend.jsonl` | new (state file) | append-only trend log for the dashboard |
| `scripts/test-health-state-derivation.js` | new | Phase A tests |
| `scripts/test-health-second-pass.js` | new | Phase B tests |
| `scripts/test-health-persistence.js` | new | Phase C tests |
| `scripts/test-health-escalation-email.js` | new | Phase D tests |
| `docs/operations/active-cron-jobs.md` | edit | note new behaviour |
| `MEMORY.md` | append | record the policy ("health email only on persistent attention/critical") |

No changes to execution paths (`src/portfolio/execution/`), basket approval, transmit scripts, or `.env`.

---

## 8. Out of scope

- Telegram or other channel delivery (kept email-only via Mailgun, matches host contract)
- A "I just want a daily summary anyway" weekly digest — separate request if Graham wants it later
- Cron-tick rate change for the health cron (stays at `0 8,14,20 * * *` UTC)
- Sentry integration tie-in — independent system, separate file paths

---

## 9. Open questions for Graham

1. **Rate-limit window after first escalation:** I've assumed 24h before re-emailing the same persistent symptom. Want shorter (e.g. 6h) or longer (e.g. 48h)?
2. **What counts as `critical` vs `attention`?** I've assumed: broker connection lost, stale approval being acted on, data-integrity issue → `critical`. Everything else with blockers → `attention`. Override if you have a different bar.
3. **Targeted second-pass fix list** — I've drafted the safe whitelist in §5 Phase B step 2. If anything should *not* be auto-attempted (e.g. you want `reconcile_inflight_rows` to always require operator approval), say so.
4. **Should the persistent on-disk HTML still get regenerated every cycle** even when no email is sent? My default: yes, because the dashboard links to it. Confirm.

If no preference, I'll use the defaults above and start with Phase A.
