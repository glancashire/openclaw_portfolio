# Daily monitoring digest

The dashboard digest emits a daily health snapshot of each portfolio via Mailgun.
It is produced by `src/reporting/dashboardDigest.js` and shipped by
`scripts/send-dashboard-digest.js`.

## Cards

The digest renders, in order:
1. **Summary metrics** — NetLiq, cash, recent P&L sparkline.
2. **Rebalance snapshot** *(added 2026-05-26, Phase C)* — drift table sourced
   from `lib/rebalanceAnalyzer.js`. Per-leg actual % vs target %, with a
   bottom-line recommendation drawn from scenario 2 (sell-overshoot) or
   scenario 1 (no-sell) depending on which actually closes the gap with cash
   on hand.
3. **AI assessment** *(added 2026-05-26, Phase C)* — `lib/aiAssessment.js`
   picks the most load-bearing observation (priority order: `drift_alert` >
   `nav_drawdown` > `awaiting_approval` > `cash_above_target` /
   `cash_below_target` > `nominal`) and emits a one-paragraph lead plus a
   tag chip block. Deterministic rule-based — no model call.
4. **History + delivery cards** (existing).

If the rebalance analyzer or assessor throws, the digest still renders the
other cards (failure mode is covered by
`scripts/test-dashboard-digest-rebalance-and-ai.js`).

## Schedule

Recommended cron expression for daily delivery:

```
35 17 * * 1-5
```

That is **17:35 local (Europe/Zurich) on weekdays**, ≈5 minutes after the
SIX close and avoiding the :00 / :30 alignment collision with other crons.
Registration is session-state, not commit-state — register via `CronCreate`
from a Claude session when ready. The schedule is **not yet registered**.

## Tests

- `scripts/test-portfolio-markdown-parsers.js` — shared parsers for
  `portfolio.md` + `holdings.md` (extracted into `lib/portfolioMarkdown.js`
  so the digest and `analyze-rebalance.js` share them).
- `scripts/test-ai-assessment.js` — branch coverage of the assessor.
- `scripts/test-dashboard-digest-rebalance-and-ai.js` — end-to-end render +
  failure mode.

All three are wired into `src/reporting/verifyRepoChecks.js`.
