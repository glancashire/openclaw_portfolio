# Portfolio Project Playbook

## Project-local skills

Use these project skills for work derived from `SPECIFICATION.md`:

1. `skills/portfolio-orchestrator/`
   - top-level coordination for implementation work
   - use for planning, sequencing, and scope checks

2. `skills/portfolio-markdown-contracts/`
   - use when generating or editing portfolio Markdown control files
   - includes file-contract reference material

3. `skills/ig-broker-adapter/`
   - use for IG / ig.com adapter design and implementation
   - keeps safety and dry-run constraints explicit

Packaged copies are in `dist/`:
- `dist/portfolio-orchestrator.skill`
- `dist/portfolio-markdown-contracts.skill`
- `dist/ig-broker-adapter.skill`

## Usage rule

When implementing this repo:
- start with `portfolio-orchestrator`
- switch to `portfolio-markdown-contracts` for file scaffolding/contracts
- switch to `ig-broker-adapter` for broker integration work

## Important guardrails

- Keep secrets out of Markdown files.
- Keep trade execution behind explicit approval/default safety gates.
- Keep ETF-only / CHF-first / read-only-first MVP scope intact unless the spec changes.
