# Phase A2 — IBKR XLS deposit auto-import CLI

Date: 2026-06-03
Owner: bb8 / Graham
Status: ACTIVE
Source: `CURRENT_PLAN.md` Phase A — auto-import CLI

## Objective

Provide a one-shot CLI that reads a fresh IBKR transactions XLS (sheet
`Deposit`), dedups against existing references in
`portfolio/<name>/deposits.md`, and appends only new rows. Saves manual
edits when Graham makes new deposits.

## Why

The 2026-06-03 import was manual: a Python xlrd dump → hand-typed table.
Repeating that on every deposit is a chore. A small CLI makes future
maintenance trivial.

## Risks / dependencies

- IBKR XLS format is BIFF (Excel 97-2003), not XLSX. Node has no built-in
  reader. Two options:
  1. Shell out to `python3 -c '...'` using the system `xlrd` we installed
     2026-06-03. Already proven; introduces a Python dependency.
  2. Pure-JS BIFF reader via a small npm package. Bigger surface area; the
     workspace policy is "no new npm dependencies" by default.
- Decision: option 1 (Python xlrd shim invoked via `child_process.spawnSync`).
  Already installed; zero new npm deps. Falls back to a clear error if
  xlrd is missing.
- Reference column is the dedup key. IBKR sometimes uses both numeric ids
  (`524372950`) and prefixed ids (`C107533357`); both are kept verbatim.

## Implementation checklist

- [ ] Add `lib/ibkrDepositXls.js` — small reader: `parseDepositXls(filePath)`
  that spawns Python with an inline xlrd script and parses the Deposit
  sheet into normalized entries.
- [ ] Add `scripts/import-ibkr-deposits.js` — CLI:
  - `--portfolio=etf`
  - `--xls=<path>`
  - `--dry-run` to print added/skipped without writing
  - dedups by `Reference` column against existing rows in
    `portfolio/<name>/deposits.md`
  - appends new rows in chronological order (after existing rows but
    keeping the sort)
  - updates the "Totals (computed)" footer block at the end of the file
- [ ] Add regression `scripts/test-import-ibkr-deposits.js`:
  - parse a fixture XLS-like input (mock the Python step via a stub
    parser) and verify dedup logic + append behavior + totals refresh
- [ ] Update `playbook.md` with the new CLI invocation.
- [ ] Update `docs/reporting-command-surface.md` with the new command.
- [ ] Update `CURRENT_PLAN.md` Phase A status.

## Acceptance criteria

- CLI can be run dry-run against the existing
  `transactions---bd83440c-4fef-4964-b80a-e66bd10c0873.xls` and
  reports zero new entries (all 8 already imported).
- A synthetic test XLS with 1 new + 1 already-known deposit yields
  dry-run output: added=1, skipped=1.
- Real run after dry-run mutates `deposits.md`, preserves table
  formatting, and rewrites the Totals footer.
- `npm test` still green; safe lane still 238/0.
