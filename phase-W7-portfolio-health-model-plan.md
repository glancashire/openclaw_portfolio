# Phase W7 — Portfolio health model & bounded self-healing

- **Wave:** W7 of `wave-plan-2026-05-27-closeout.md`
- **Roadmap item:** Post-MVP #1 — Portfolio health model + bounded self-healing
- **Owner:** bb8 (subagent)
- **Started:** 2026-05-27

## Goal

Promote the existing `selfHeal.js` / `portfolioHealth.js` infrastructure into
first-class operator surfaces:

- `scripts/trade-health.js` — unified read-only health view
- `scripts/trade-self-heal.js` — dry-run by default, `--apply` to attempt recipes
- Bounded self-healing: per-recipe **retry budgets** + **cooldowns**, enforced
  from the observability event log
- Tests, wired into `verifyRepoChecks`

## Non-goals

- Actually restarting the IBKR gateway or disabling crons. Existing recipes
  remain `applied:false` with a `blocked` reason regardless of `--apply`. The
  apply mode only governs whether attempts are recorded to the observability
  log (so the budget/cooldown gates accumulate evidence) and is a hook for
  future safe recipes.
- Changing the `healthReport.js` consumption path. `buildSelfHealPlan()`
  output shape is preserved (additive only).

## Design

### CLI shapes

`node scripts/trade-health.js [--portfolio=etf] [--json]`

Resolves `portfolio/<name>` under repo root, runs:

1. `buildSelfHealPlan({ portfolioDir, repoRoot, now })` — single source of
   truth for both classification and healing plan.
2. Reads `trades.md` once via `summarizeOpenRunnerRetryState` +
   `staleApprovalInventory` (already inside the plan).

Then prints a human-readable summary by default:

```
Portfolio: etf
Health: blocked (severity: high)
Next action: Restore native IBKR connectivity ...
Open issues:
  [high]  ibkr_socket_dead — connect ECONNREFUSED 127.0.0.1:4001
  [medium] delivery_missing_target — Telegram requires target
Trade-level:
  Stale approvals: 0
  Queued initial:  0  retry: 1
Self-heal plan:
  restart_ibkr_gateway_if_socket_dead — blocked: operator_present_restart_only
  disable_cron_after_N_consecutive_errors — blocked: manual_or_future_gateway_integration_required
```

`--json` emits the full plan as JSON. Exit code:
- `0` if `health.health === 'healthy'`
- `2` otherwise (operator-actionable)

`node scripts/trade-self-heal.js [--portfolio=etf] [--apply] [--json]`

Default is `--dry-run` (mutually exclusive with `--apply`). Flow:

1. Build the plan as above.
2. For each `healed` entry, print `kind — applied|blocked: <reason>`.
3. In `--apply` mode, after the budget/cooldown gate passes for a recipe, the
   attempt is recorded to the observability log even if the recipe itself
   resolves to `blocked` (e.g. `operator_present_restart_only`). This makes
   budget enforcement testable without performing any privileged action.
4. `--dry-run` MUST NOT write any observability events.

Exit code: `0` if every recipe resolved without surfaced error, `2` if any
`ok:false` or unexpected failure.

### Retry budgets and cooldowns

In `src/execution/selfHeal.js`:

```js
const RETRY_BUDGET = {
  restart_ibkr_gateway_if_socket_dead: { perDay: 2 },
  disable_cron_after_N_consecutive_errors: { perDay: 3 },
};
const COOLDOWN_MINUTES = {
  restart_ibkr_gateway_if_socket_dead: 30,
  disable_cron_after_N_consecutive_errors: 60,
};
```

Helpers:

- `listRecipeAttempts(recipe, { repoRoot, now })` — events from the last 24h
  with `kind === 'self_heal_recipe_attempt'` and matching `recipe`.
- `evaluateRecipeBudget(recipe, { repoRoot, now })` — returns
  `{ blocked: 'retry_budget_exhausted' | 'cooldown_active' | null, ... }`.

`applyHealRecipes(classified, { now, repoRoot, dryRun = true })`:

1. For each healable item, evaluate budget. If blocked, return the budget
   block result (and stop — don't invoke the underlying recipe).
2. Otherwise invoke the recipe (existing behavior).
3. If `!dryRun && repoRoot`, append a `self_heal_recipe_attempt` event.

`portfolioHealth.buildSelfHealPlan` passes `repoRoot` through.

Backward-compat: `repoRoot` defaults to `process.cwd()`, `dryRun` defaults
to `true`. Existing tests don't pass either and remain green because the
observability log doesn't exist in their tempdirs.

### Tests

- `scripts/test-trade-health-cli.js`
  - Script exists and is requirable without crash.
  - With mocked `buildSelfHealPlan` (via Module._load), `--json` emits the
    expected fields and exit code matches health state.
  - Missing portfolio dir surfaces a clear error and non-zero exit.
- `scripts/test-self-heal-budget.js`
  - 3rd attempt within 24h → `blocked: 'retry_budget_exhausted'`.
  - Attempt within cooldown window → `blocked: 'cooldown_active'`.
  - Both clear once windows expire (synthetic `now`).
  - Dry-run never appends observability events; `--apply` does.

Both wired into `src/reporting/verifyRepoChecks.js`.

## Steps

1. Commit this plan.
2. Implement budget/cooldown helpers in `selfHeal.js`; thread `repoRoot` from
   `buildSelfHealPlan`.
3. Build `scripts/trade-health.js` and `scripts/trade-self-heal.js`.
4. Add the two test scripts and wire into `verifyRepoChecks`.
5. `npm test` until green.
6. Commit + push, print summary.
