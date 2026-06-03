# Portfolio Project Playbook

**Host contract:** see `docs/operations/openclaw-host-contract.md` for the canonical channels/sandbox/cron-delivery/restarts/approvals matrix.

## Project-local skills

Use these project skills for work derived from `SPECIFICATION.md`:

1. `skills/superpowers-openclaw/`
   - OpenClaw-adapted spec/plan/verify workflow for software delivery
   - use before non-trivial coding or multi-step implementation work

2. `skills/portfolio-orchestrator/`
   - top-level coordination for implementation work
   - use for planning, sequencing, and scope checks

3. `skills/portfolio-markdown-contracts/`
   - use when generating or editing portfolio Markdown control files
   - includes file-contract reference material

4. `taskflow` (built-in skill)
   - use for durable multi-step detached work with waits/child tasks

Packaged copies are in `dist/`:
- `dist/portfolio-orchestrator.skill`
- `dist/portfolio-markdown-contracts.skill`

## Usage rule

When implementing this repo:
- start with `superpowers-openclaw`
- then use `portfolio-orchestrator`
- switch to `portfolio-markdown-contracts` for file scaffolding/contracts
- use `taskflow` for durable multi-step detached work
- use the Interactive Brokers adapter docs/code directly for broker integration work

## Important guardrails

- Keep secrets out of Markdown files.
- Keep trade execution behind explicit approval/default safety gates.
- Keep ETF-only / CHF-first / read-only-first MVP scope intact unless the spec changes.
- Keep the MVP broker scope focused on Interactive Brokers only until the implementation is complete and stable.

## Basket execution runbook

For live basket execution (Phases 184–198), see `docs/basket-execution-runbook.md`. The summary: every round is one `approve` interaction; assistant never edits code between rounds; failed legs auto-generate a fresh reproposal with one new approval gate.

## Console helpers

- **`show dashboard`** → `node scripts/show-dashboard.js [portfolio]` (default `etf`). Compact console view of value/cash/allocation/queue/next step with a sanity check that total = invested + cash. Run after `node scripts/regenerate-dashboard.js portfolio/<name>` if the underlying state changed.
- **Email digest preview** → `node scripts/regenerate-dashboard-email-preview.js [portfolio]` writes the current daily digest to `runtime/dashboard-email-phase7-preview.{html,txt}` without sending. Use to eye-check email rendering in light + dark.
- **Usage counters** → `node scripts/regenerate-usage-counters.js` rebuilds `runtime/overview/usage-counters.json` from evidence on disk. Then `node scripts/regenerate-usage-kpi.js` produces the KPI artifact triplet. The daily digest send (`send-dashboard-digest.js`) auto-refreshes the counters at the start of every send (Phase C), so manual regeneration is only needed for ad-hoc inspection.
- **Backfill history net-deposited** → `node scripts/backfill-history-net-deposited.js --portfolio=<name>` rewrites `history.md` with the cumulative `Net deposited CHF` column populated from `deposits.md`. Idempotent. Add `--dry-run` to inspect.
- **Import IBKR deposits** → `node scripts/import-ibkr-deposits.js --portfolio=<name> --xls=<path>` dedups against existing references in `deposits.md` and appends new rows. Add `--dry-run` first. Requires Python `xlrd` on the host.

## Wrappers and shims

Some scripts look like dead code but are kept on purpose. See `docs/operations/wrappers-and-shims.md` before deleting any of them. Highlights:

- `scripts/execute-trades.js` is a deliberate failure shim (exit 1 + obsolescence redirect). Locked in by `scripts/test-execute-trades-shim-contract.js` and used by `scripts/test-trading-guards.js`.
- 14 diagnostic-script wrappers in `scripts/` forward to `scripts/diagnostics/` and are locked in by `scripts/test-diagnostics-script-compat.js`.

## Generated-artifact idempotence (decision)

2026-06-03 — defer naming a separate idempotence verification lane. Existing checks (`scripts/check-generated-state.js`, `scripts/test-test-manifest-shape.js`, root-cleanliness, `npm test`) cover the surface. Revisit if churn-driven false-reds appear.
