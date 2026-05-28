# Repo portability checklist

## Goal
Move this repository to another OpenClaw instance without losing required non-secret project logic, contracts, or bootstrap instructions.

## Portable by git clone
These paths are part of the repo contract and should be present after clone:

- `src/` — application logic
- `scripts/` — operational CLIs, verification helpers, test runners
- `tests/` — test coverage
- `docs/` — operator/setup/reference docs
- `plans/`, `archive/` — implementation history and active phase plans
- `portfolio/_template/` — bootstrap template material
- `portfolio/etf/portfolio.md` — ETF portfolio control file / approved instruments / policy
- `portfolio/etf/trades.md` — portfolio trade log and cost-basis source material
- `config/`, `lib/`, `brokers/` — checked-in project code/config assets
- root contract files such as `SPECIFICATION.md`, `PHASE_OVERVIEW.md`, `AGENTS.md`, `TOOLS.md`
- `.githooks/pre-commit` — local focused verification gate
- `.gitignore` — defines local/runtime exclusions

## Intentionally local / runtime-only
These should **not** be required from git for a fresh deployment:

- `runtime/` — generated state, caches, events, overview surfaces, keepalive state
- `memory/`, `MEMORY.md`, `.openclaw/`, `secrets/`, `.env*` — assistant-local memory and secrets
- `node_modules/`, `.venv-ibkr-tz/`, `tmp/`, `backups/` — machine-local dependencies and disposable artifacts

## Tracked generated artifacts to treat as evidence, not bootstrap prerequisites
These are currently tracked and useful for operator review, but they are not source-of-truth requirements for bringing up another instance:

- `portfolio/etf/dashboard.md`
- `portfolio/etf/summary.{md,json,html}`
- `portfolio/etf/health-report.{md,json,html}`
- `portfolio/etf/recovery-checklist.{md,json,html}`
- `portfolio/etf/history.md`
- `portfolio/acceptance-closure/*.json`

A fresh instance should be able to regenerate them from source files plus runtime data.

## Current portability verdict
Portable **with documented setup steps**, not as a zero-config clone.

What must still be supplied on the target host:

- Node/npm runtime compatible with the repo
- OpenClaw installed and configured on the host
- broker credentials / IBKR auth and any host-specific broker runtime wiring
- channel/email credentials if delivery flows are desired
- any required local env/secrets excluded by `.gitignore`

## Bring-up checklist on another OpenClaw instance
1. Clone the repo.
2. Install dependencies (`npm install`).
3. Configure OpenClaw + any required host secrets/credentials.
4. Review `portfolio/etf/portfolio.md` and `portfolio/etf/trades.md` for the intended portfolio contract.
5. Run focused verification:
   - `node scripts/test-test-manifest-shape.js`
   - `npm run test:all -- --lane=safe`
6. Regenerate operational/reporting artifacts on the target host rather than copying local `runtime/` state.
7. Verify broker-specific readiness separately before any live workflows.

## Audit notes from this phase
- Safe-lane failures blocking portability were fixed in code/tests rather than papered over:
  - digest rendering expectations updated for profit/loss-first reporting
  - broker-block priority fixture refreshed to respect 7-day stale age-out policy
  - holdings FX reconciliation assertions corrected to the CHF-converted truth
  - IBKR ledger exchange-rate helper is now exported and tested
  - test manifest was refreshed to include the new coverage
- The main remaining repo noise is tracked generated portfolio artifacts and unstaged local runtime churn, not missing bootstrap source files.
