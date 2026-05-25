# Phase 206 — Dashboard v2: stats visualization

## Objective
Add operator-requested dashboard improvements (request "a"). Most existing infra is reusable; we extend rather than replace.

### What exists
- `runtime/overview/index.html` — operator cockpit with KPI cards + nav.
- `runtime/overview/daily-summary.{html,md,json}` — portfolio summary.
- `src/reporting/summaryArtifacts.js` already renders **allocation drift bars** (HTML) using `.allocation-bar-card` CSS. Reuse.
- `src/reporting/emailHtml.js` has `page`, `card`, `badge`, `metricGrid`, `dataTable`, `bulletList` helpers — Mailgun-friendly inline styles.
- `portfolio/etf/history.md` has daily net-liq + cash + invested time series. Use as data source.

### What's missing
1. **Cron health card** on `index.html` — list of jobs + consecutive-errors badge.
2. **SVG sparkline** of net-liq over last N days inline on `daily-summary.html`.
3. **Per-instrument table** with quote-quality tier + last-fill + drift% (currently we have allocation by asset class only).
4. **Trend pulse** card: cash deployed CHF over last 7 days; gains/losses.

## Risks / dependencies
- `index.html` is rendered by `dashboardGenerator.js` (cockpit) — different code path than daily-summary.
- Sparklines via inline SVG: must work in both HTML files AND email (Mailgun-friendly: no JS, no external assets, only inline SVG).
- History.md has duplicated rows — we'll dedupe by date+snapshot when reading.

## Actionable checklist
- [ ] New module `src/reporting/sparkline.js`: `buildSparklineSvg(values, opts)` returning inline SVG string.
- [ ] New module `src/reporting/historyDigest.js`: `readNetLiqHistory(portfolioDir)` returns `[{date, totalChf, cashChf, investedChf}]` deduped (latest snapshot per date).
- [ ] New module `src/reporting/cronHealthCard.js`: `summarizeCronJobs(jobs)` returning sorted list with severity.
- [ ] Wire into `dashboardGenerator.js` index.html template: add Cron Health card.
- [ ] Wire into `summaryArtifacts.js` daily-summary.html template: add Net-Liq Sparkline section.
- [ ] Tests:
  - `test-sparkline.js` — unit (small values, single point, all zeroes, normal series).
  - `test-history-digest.js` — dedupe behaviour and ordering.
  - `test-cron-health-card.js` — severity mapping.
- [ ] Regenerate dashboard, verify no breakage.

## Acceptance criteria
- `runtime/overview/index.html` shows a Cron Health card with sensible severity badges.
- `runtime/overview/daily-summary.html` shows a Net-Liq sparkline.
- All previous focused tests still green; 3 new tests pass.
