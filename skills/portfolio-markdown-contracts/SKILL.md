---
name: portfolio-markdown-contracts
description: Create, validate, or revise the Markdown control files for the OpenClaw portfolio-manager project. Use when generating or updating `portfolio.md`, `holdings.md`, `trades.md`, `history.md`, `dashboard.md`, report templates, schedules, or any Markdown contract defined by SPECIFICATION.md.
---

# Portfolio Markdown Contracts

Use this skill when working on the Markdown files that define and store portfolio state.

## Rules

- Follow the exact required sections from the spec unless the user explicitly changes the contract.
- Keep files easy to inspect and diff.
- Use placeholders rather than inventing unknown live values.
- Never store secrets, tokens, or raw credentials in Markdown.
- When generating files, preserve append-only intent for `trades.md` and snapshot-history intent for `history.md`.
- Read `references/file-contracts.md` before creating or editing contract files.

## Workflow

1. Identify which contract file is being created or edited.
2. Read the corresponding section in `references/file-contracts.md`.
3. Generate the full file skeleton with correct headings/tables.
4. Fill only values known from user input or spec defaults.
5. Leave unresolved fields obvious and explicit.
6. Keep naming and folder placement aligned with the repo structure.

## Validation checklist

Before finishing:
- required headings exist
- required tables exist
- approval and safety language is preserved
- base currency / broker / execution mode remain consistent
- no secrets appear in Markdown
