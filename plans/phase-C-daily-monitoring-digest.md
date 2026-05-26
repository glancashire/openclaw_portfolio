# Phase C plan — Daily monitoring digest with AI assessment

## Objectives
- Extend the existing `dashboardDigest` pipeline with two new compact cards:
  1. **Drift snapshot** — pull from `lib/rebalanceAnalyzer.js`. Shows per-leg actual % vs target %, with sparkline-style drift bars in HTML. Surfaces the "what would I do today" recommendation in plain text.
  2. **AI assessment** — a structured short-form commentary, generated from deterministic inputs (drift, NAV trend, cron-health, open approvals). NOT a model call from this script; just a rule-based aggregator that picks the most-load-bearing observation and renders it as one paragraph + a structured tag block. (A future enhancement could swap in a model call; the contract stays the same.)
- Add a daily cron entry at **17:35 UTC** (≈ end of SIX trading day with a 5-minute settle buffer; avoids the :00 / :30 alignment collision).
- Provide both HTML and plaintext fallbacks (existing digest already does this — the new cards extend the same surface).

## Risks / dependencies
- `dashboardDigest.js` is already used in production. Risk: a new render path throwing breaks the daily mail. Mitigate: render new cards in a `try/catch`; on error, log and emit a `<!-- digest-section error -->` HTML comment instead. Cover with a failure-mode unit test.
- The rebalance card depends on portfolio.md + holdings.md parsing already in `scripts/analyze-rebalance.js`. Refactor: move the parsers into a new shared module `lib/portfolioMarkdown.js` so the digest and CLI both use them. Add tests there.
- AI assessment rules will be deterministic and explicit. Examples:
  - If any leg has |drift| > 5pp → tag `drift_alert`, surface as the lead observation.
  - If cash > target + 5pp → tag `cash_above_target`, lead with "ready to deploy".
  - If NetLiq 7-day delta < -3% → tag `nav_drawdown`, lead with the magnitude.
  - If pending approvals > 0 → tag `awaiting_approval`.
  - If multiple tags fire → priority order: `drift_alert` > `nav_drawdown` > `awaiting_approval` > `cash_above_target` > `nominal`.
- Cron entry uses the same `CronCreate` mechanism as the existing Tuesday basket cron. Durable.

## Actionable checklist
- [ ] Extract markdown parsers from `scripts/analyze-rebalance.js` into `lib/portfolioMarkdown.js`. Re-export from CLI. Verify analyzer test still passes.
- [ ] New module `lib/aiAssessment.js` with `assessPortfolio({ plan, navHistory, summary }) → { lead, tags[], details }`. Pure function.
- [ ] Unit tests for the assessor: each tag fires on its trigger; priority order correct; no-issue case returns `tags: ['nominal']` with a benign lead.
- [ ] New cards in `dashboardDigest.js`:
  - `renderRebalanceSnapshotCard(plan)` — drift table with colored cells; one-line scenario summary at the bottom.
  - `renderAiAssessmentCard(assessment)` — lead paragraph, tag chips, plain-text plaintext block in the text fallback.
- [ ] Body assembly: insert new cards just after sparkline. Wrap each in `try/catch` to keep digest robust.
- [ ] New test `scripts/test-dashboard-digest-rebalance-and-ai.js`:
  - Renders the digest against a seeded portfolio fixture.
  - Asserts drift-snapshot HTML contains expected drift sign + recommendation.
  - Asserts AI assessment card contains the expected lead tag for the seeded scenario (e.g. SPMCHA 2× → drift_alert).
  - Failure-mode: corrupt the analyzer input; digest still renders other cards, error swallowed.
- [ ] New durable cron entry registered via `CronCreate` (in a follow-up session — for this phase just document the cron expression in the plan, since cron registration is session-state, not commit-state). Cron expression: `35 17 * * 1-5` (weekdays at 17:35 local).
- [ ] Update `docs/setup/` or `MEMORY.md` with the digest cadence.
- [ ] Run full adjacent suite (digest tests, rebalance tests, lifecycle tests) until green.
- [ ] Commit + push.

## Acceptance criteria
- `lib/portfolioMarkdown.js` exports `parseAllocationTargets`, `parseHoldings`, `applyAliases`; both the analyzer CLI and the dashboard digest use it; existing tests still pass.
- `lib/aiAssessment.js::assessPortfolio` is pure-function and has 100% branch coverage in the new unit test.
- The dashboard digest, when rendered for today's actual ETF state, includes:
  - A drift snapshot card showing SPMCHA over by ~+7.7pp and other legs near target.
  - An AI assessment lead beginning with the drift_alert observation.
- Failure-mode: if the analyzer throws, the digest still emits successfully without the new cards (covered by test).
- All adjacent tests pass.
- Plan + code + tests committed and pushed.
- Cron expression for daily delivery is documented (registration is a follow-up step).
