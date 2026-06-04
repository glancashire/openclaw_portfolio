# Phase G4 — Document the deposits-ledger lifecycle

**Date:** 2026-06-03
**Source plan:** `CURRENT_PLAN.md` Phase G — Deposits ledger close-out

## Objective

Add a self-contained "Deposits ledger" section to `docs/operator-runbooks.md` so an operator knows:

1. What the ledger is and why it exists (total-return correctness).
2. Where it lives (`portfolio/<name>/deposits.md`) and the row schema.
3. How to record a new deposit (manual append, format requirements).
4. How the auto-import CLI works (`scripts/import-ibkr-deposits.js`), including dry-run.
5. The `pending_ibkr_xls` placeholder convention and how to backfill.
6. How `lib/depositsLedger.js#netDepositedAsOf` propagates to `history.md` Net deposited column and the digest hero.
7. What to verify after appending (run safe lane + dashboard digest dry-run).

## Risks / Dependencies

- None. Read-only doc work; no code changes.
- Must stay in sync with the existing CLI flags (`--portfolio`, `--xls`, `--dry-run`) and the markdown contract (column order in deposits.md).

## Checklist

- [ ] Append new section "Deposits ledger" to `docs/operator-runbooks.md` with subsections:
  - [ ] Use when
  - [ ] File contract (schema)
  - [ ] Manual append flow
  - [ ] Auto-import CLI flow (with dry-run + dedup behaviour)
  - [ ] `pending_ibkr_xls` backfill convention
  - [ ] Downstream surfaces (history Net deposited, digest hero, dashboard total return)
  - [ ] Verification after editing
- [ ] Cross-link from existing reporting / execution evidence list.
- [ ] Add a regression test that asserts the section exists and references the CLI + parser.

## Acceptance criteria

- The new section is byte-stable (does not double-emit on re-runs of any generator).
- Existing safe lane stays at 242 passing.
- New lightweight regression test asserting key strings are present in the runbooks doc.
- No changes to executable code paths.
