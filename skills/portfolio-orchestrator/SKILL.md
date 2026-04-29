---
name: portfolio-orchestrator
description: Build, extend, or maintain the OpenClaw portfolio-manager system described in SPECIFICATION.md. Use when creating project structure, planning implementation phases, coordinating portfolio workflows, enforcing safety and approval gates, or deciding which portfolio sub-skill to apply next.
---

# Portfolio Orchestrator

Use this skill as the top-level coordinator for portfolio-manager work.

## Core rules

- Treat `SPECIFICATION.md` as the source of truth for scope and constraints.
- Keep safety constraints intact: ETF-only MVP, CHF-first, read-only and dry-run before any live execution.
- Keep strategy logic, broker logic, reporting, and storage layout separate.
- Prefer transparent Markdown state over hidden runtime state.
- When work touches repo structure or templates, read `references/repo-plan.md`.
- When work touches portfolio file formats, read `../portfolio-markdown-contracts/references/file-contracts.md`.
- Keep broker implementation work focused on Interactive Brokers unless the spec changes again.

## Workflow

1. Identify the requested task against the MVP build order in `SPECIFICATION.md`.
2. Map it to one of these lanes:
   - scaffolding/templates
   - markdown parser/writer and validation
   - portfolio workflow logic
   - Interactive Brokers adapter work
   - reporting/scheduling
3. Read only the relevant reference file(s) for that lane.
4. Produce or update implementation assets in small, auditable steps.
5. Preserve explicit approval gates for any trade execution path.
6. Prefer writing plans/spec-adjacent artifacts to files instead of keeping them only in chat.

## Build-order guardrail

Prefer this implementation order unless the user explicitly asks to skip ahead:

1. Folder/file scaffolding
2. Template portfolio
3. Structured Markdown parser/writer
4. Portfolio creation workflow
5. Strategy validation
6. Interactive Brokers adapter in read-only mode
7. Holdings sync
8. Dashboard generation
9. ETF suggestion workflow
10. Trade proposal engine
11. Dry-run order generation
12. Trade log updates
13. History snapshots
14. Reports
15. PDF export
16. Live execution only after dry-run validation

## Output expectations

- Create ready-to-use files, not vague plans.
- Keep interfaces explicit.
- Keep secrets out of Markdown.
- If a requested feature conflicts with MVP scope, say so directly and propose the nearest in-scope alternative.
