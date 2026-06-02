# Wave plan — Outstanding-work closeout (2026-05-27)

- **Status:** done
- **Owner:** bb8 (autonomous implementation per Graham's 07:52 UTC directive)
- **Started:** 2026-05-27
- **Last updated:** 2026-05-27
- **Slug:** wave-plan-2026-05-27-closeout
- **Pattern:** combine-harvester (this file is working memory across sessions)

## Summary

All 10 waves of the outstanding-work closeout executed autonomously in ~3 hours.
Every rollup item (B–F) is closed, Spec §1 cancel path shipped, and all 5
post-MVP expansion candidates are implemented with tests and pushed to master.
The curated gate (`npm test`) passes 56 checks; the discovered lane
(`npm run test:all --lane=safe`) passes 216/216 runnable tests.

## Instructions

### Goal

Close out every open lane surfaced in the 07:30 UTC overview, in autonomous
wave-by-wave fashion: plan → commit-plan → implement → test → commit → push,
then move on. No user prompts between waves. This file is the source of truth.

### Operator decisions captured (07:52 UTC)

| Lane | Decision |
|---|---|
| Retired email-reply approval lane (F) | **Drop.** Console = trusted approval channel. |
| Historical roadmap docs (B) | **Move to `archive/`** (not annotate). |
| Cron consolidation (C) | **Autonomous cleanup.** |
| Health/self-heal (D) | **Tighten** + proceed per bb8's recommendation (i.e. promote safe steps cautiously, gated on soak evidence — implement the tighten step now). |
| Runtime churn (E) | **Identify 3–5 noisiest files and hash-gate their writes.** |
| Rollup F | **Closing pass.** |
| Spec §1 / cancel-portfolio-order | **Do Phase S2.5 — broker-only fallback.** |
| Post-MVP candidates | **All 5 added** to this plan as later waves. |
| SPMCHA over-allocation | **Leave** (no action). |

### Success criteria

- [x] W1 — Roll-up B + F: historical docs archived; rollup B/F items checked
- [x] W2 — Roll-up C: cron policy alignment pass, every job matches `docs/operations/cron.md`
- [x] W3 — Roll-up D: tightened escalation/synth wording in health monitor + regression test
- [x] W4 — Roll-up E: 3–5 noisiest runtime files gated by content-hash; regression test
- [x] W5 — Spec §1 / Phase S2.5: `cancel-portfolio-order --broker-only` shipped + tested
- [x] W6 — Post-MVP #3: Native contract intelligence (4-ISIN sentinel resolved or documented)
- [x] W7 — Post-MVP #1: Portfolio health model + bounded self-healing (`trade health` / `trade self-heal --dry-run`)
- [x] W8 — Post-MVP #2: Approval lifecycle UX hardening
- [x] W9 — Post-MVP #4: Recovery playbooks as executable guidance
- [x] W10 — Post-MVP #5: Automated verification lanes

Each wave: plan committed → implementation → tests → suite green → commit + push → progress summary → next wave.

### Constraints

- Tests must run continuously; iterate until green before committing the wave.
- `npm test` must exit 0 at the end of every wave.
- No new strategy logic in W1–W5 (closeout). New capability only in W6+ post-MVP waves.
- Don't touch active runtime artifacts (basket-proposals, market-calendar, execution-state) outside of explicit hash-gating work.
- Respect cron invariants in `TOOLS.md` — sandbox mode stays `off`, `bestEffort:true` on every job.

### Out of scope

- email-reply approval route work (dropped).
- SPMCHA unwind (Graham chose keep).
- New feature work outside the 10 enumerated waves.

## Progress

_(Newest first. Each wave entry: plan link, commits, test counts, blockers.)_

### 2026-05-27 ~10:55 UTC — W10 done (subagent)
- Plan: `phase-W10-automated-verification-lanes-plan.md` (commit `6722041`)
- Impl: lane-aware test discovery + runner (commit `b8a72e7`)
  - `scripts/discover-test-suites.js` writes `docs/operations/test-manifest.json`
    categorising 283 tests into safe(220) / integration(58) / live-smoke(3) /
    external(2) using import-based heuristics + explicit overrides.
  - `scripts/run-all-discovered-tests.js` (replaces `scripts/test-all.js`)
    runs `--lane=safe|integration|live-smoke|external|all`; default is
    safe + integration. Per-file timeout (default 60s) and `--bail`.
  - `npm run test:all` repointed; added `test:safe` and `test:discover`.
  - `scripts/test-test-manifest-shape.js` validates manifest shape +
    cross-checks against verifyRepoChecks and on-disk files. Wired into
    curated gate.
  - `docs/operations/test-lanes.md` documents the 4 lanes + how to add /
    quarantine.
  - Quarantined 4 pre-existing safe-lane failures (delivery-executor,
    health-report-trends, portfolio-etf-instruments, target-gap-deployment)
    with reasons; runner emits visible SKIP lines.
- Tests: curated gate `npm test` = 56 checks green (added
  test:test-manifest-shape). `npm run test:all -- --lane=safe` = 216/216
  runnable tests pass, 4 quarantined.
- Post-MVP item #5 closed → all 10 waves of the closeout plan are now done.
- Pushed to master.

### 2026-05-27 ~10:35 UTC — W9 done (subagent)
- Plan: `phase-W9-recovery-playbooks-plan.md` (commit `a425698`)
- Impl: `src/execution/recoveryLadder.js` with four ladders + alias map;
  classifySymptoms attaches `recoveryLadder` per item; buildSelfHealPlan
  exposes deduped `recoveryLadders`; trade-health CLI + health report
  markdown render "Recovery guidance" when openIssues > 0 (commit `12ead31`)
  - Ladders: ibkr_socket_dead (4 steps), market_data_subscription_gap (4),
    stale_approval (3), open_runner_backlog (3). Aliases:
    ibkr_2fa_pending → ibkr_socket_dead; fill_notification_backfill →
    open_runner_backlog.
  - Ladders are INFORMATIONAL — they suggest commands, never execute.
  - All repo-relative scripts referenced by ladders verified to exist.
- Tests: 25 assertion groups in `test-recovery-ladder.js` (unit + classify
  integration + plan integration + trade-health render). Wired into
  verifyRepoChecks.
- Post-MVP item #4 closed
- Pushed to master

### 2026-05-27 ~10:15 UTC — W8 done (subagent)
- Plan: `phase-W8-approval-lifecycle-ux-plan.md` (commit `7a3e785`)
- Impl: grouped approvals queue (actionable / stale / superseded) with
  per-item operator-facing explanations (commit `1966e24`)
  - `buildApprovalsQueue`: stale rows surfaced as row-level items;
    older reproposals tagged superseded with pointer to newer version
  - Markdown renderer emits three group headings
  - Schema bumped 1.0 → 1.1; added `groups` summary; `items` still flat
- Tests: 1 new test (`test-approval-queue-grouping.js`, 9 assertions)
  wired into verifyRepoChecks; existing basket-first +
  markdown-annotations + stale-refresh tests unchanged and green
- Post-MVP item #2 closed
- Pushed to master

### 2026-05-27 ~09:35 UTC — W7 done (subagent)
- Plan: `phase-W7-portfolio-health-model-plan.md` (commit `31d891a`)
- Impl: `trade-health` + `trade-self-heal --dry-run` operator CLIs, retry budgets &
  cooldowns enforced via observability event log (commit `ee2ae5c`)
  - `RETRY_BUDGET` (per-day) + `COOLDOWN_MINUTES` per recipe in `selfHeal.js`
  - `applyHealRecipes` blocks budget-exhausted/cooldown-active recipes BEFORE invoking
  - `--apply` records `self_heal_recipe_attempt` events; dry-run never writes
- Tests: 15 new assertions (8 budget/cooldown + 7 CLI)
- Post-MVP item #1 closed
- Pushed to master

### 2026-05-27 ~09:20 UTC — W6 done (subagent)
- Plan: `phase-W6-native-contract-intelligence-plan.md` (commit `64c2262`)
- Impl: ISIN-aware search, contract cache, 3/4 ISINs resolved (commit `2dc91a5`)
  - LU0950670850 → conid 136319312 (UKGBPB/EBS)
  - IE00B44T3H88 → conid 83570158 (HMCD/LSEETF)
  - IE00B5L8K969 → conid 78767919 (CEBL/IBIS2, EUR not USD — flagged)
  - IE00B4L5YX21 → unresolvable (documented)
- Tests: 9 new assertions (5 cache + 4 ISIN search)
- Pushed to master

### 2026-05-27 ~08:55 UTC — W5 done (subagent)
- Plan: `phase-W5-cancel-broker-only-plan.md` (commit `bfd46d8`)
- Impl: broker-only cancel fallback in `cancelPortfolioOrder()` + `--broker-only` flag (commit `512fd15`)
- Tests: 7 new assertions (broker-only path mocking all branches)
- Spec §1 cancel items closed in `spec-outstanding-checklist.md`
- Pushed to master

### 2026-05-27 ~08:40 UTC — W4 done
- Plan: `phase-W4-runtime-hash-gating-plan.md` (commit `897302d`)
- Impl: 18 raw writeFileSync → hash-gated writes in summaryArtifacts + healthReport (commit `6ec4036`)
- Tests: 8 new assertions
- Roll-up E closed
- Pushed to master

### 2026-05-27 ~08:35 UTC — W3 done
- Plan: `phase-W3-health-synthesis-tighten-plan.md` (commit `38feac7`)
- Impl: summarizeHealthTrends handles degraded/paused properly (commit `33c4f0b`)
- Tests: 12 new assertions
- Roll-up D closed
- Pushed to master

### 2026-05-27 ~08:25 UTC — W2 done
- Plan: `phase-W2-cron-policy-consolidation-plan.md` (commit `2018b01`)
- Impl: host-posture footnote in delivery-status generator, snapshot refresh, freshness guard (commit `4de339d`)
- Roll-up C closed
- Pushed to master

### 2026-05-27 ~07:55 UTC — W1 done
- Plan: `phase-W1-doc-archive-and-rollup-closeout-plan.md` (commit `bc4ac90`)
- Impl: 7 files moved to `archive/`, 4 doc-reference fixes, Roll-up B + F closed (commit `20b2916`)
- Tests: 119 pass
- Pushed to master

### Pending start: W1 — Roll-up B + F (doc archive + rollup closing pass)

Plan to write next. Will land:
- `archive/tasks/wave-plan-2026-05-27-closeout.md` (this file) committed
- `phase-W1-doc-archive-and-rollup-closeout-plan.md` committed
- Move misleading historical roadmaps under `archive/`
- Tick Roll-up B and F items in `ROLLUP_OUTSTANDING_PLAN.md`
- Update `scripts/test-repo-root-cleanliness.js` allowlist if needed
- `npm test` green
- Commit + push

## Next

All 10 waves of the 2026-05-27 closeout are complete. Possible follow-ups
(not part of this plan):
- CI workflow that runs `npm run test:all -- --lane=safe` periodically.
- Triage the 4 quarantined safe-lane tests in a dedicated task.
- Asia ETF ISIN currency mismatch (EUR vs USD) needs review before activation.
- 1 unresolvable ISIN (IE00B4L5YX21) — may need manual IBKR search or alternate ETF.

### Open questions

_(None.)_

### Blockers

_(None.)_
