# Portfolio Project Playbook

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
