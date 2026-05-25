# Phase 183A — Basket Approval Envelope Plan

## Objectives
- Introduce a durable basket approval artifact independent of ambiguous trade-row state.
- Define per-leg approval semantics: instrument identity, quantity cap, price band, venue, attempts, retry policy.
- Add helpers to write, load, validate, and summarize approval envelopes.
- Keep the new artifact additive so existing `trades.md` and execution flows continue to work.

## Risks / dependencies
- Existing live approval intent is currently spread across chat text and trade rows.
- New schema must be strict enough to be safe but simple enough to use from later execution phases.
- Must avoid binding to stale runtime-only fields that make resume/restart fragile.

## Actionable checklist
- [ ] Define basket approval JSON shape and storage path.
- [ ] Implement schema validation / normalization helpers.
- [ ] Implement write/load/list helpers for approval envelopes.
- [ ] Implement per-leg status placeholders for later execution phases.
- [ ] Add unit tests for validation, normalization, persistence, and expiry handling.
- [ ] Add regression tests ensuring malformed or incomplete approvals are rejected safely.
- [ ] Run targeted tests, then repo verification.

## Acceptance criteria
- A basket approval artifact can be created and loaded from disk reliably.
- Each leg captures the bounded execution intent needed for later autonomous execution.
- Invalid or expired approvals are rejected deterministically.
- Tests cover normal, partial, and malformed approval cases.
