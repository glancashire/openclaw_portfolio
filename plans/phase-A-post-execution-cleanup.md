# Phase A plan — Post-execution cleanup & hardening (2026-05-26)

## Objectives
- Eliminate the class of bug that produced this morning's duplicate SPMCHA fill: make live-order scripts idempotent / explicit so a second invocation cannot silently re-transmit.
- Silence the ib_insync `ModuleNotFoundError: tzdata` traceback noise observed during basket execution, so future execution logs are not littered with red herrings.
- Document the open follow-ups identified today (multi-portfolio test slow path, no Mailgun inbound route) so they are visible without acting on them prematurely.

## Risks / dependencies
- The live-order idempotency guard is a runtime-behaviour change for the IBKR client wrapper. Risk of breaking existing happy-path execution — mitigate with opt-in idempotency key (off by default) and unit-test coverage of both branches.
- The tzdata fix touches the python user environment, not the Node code. Reversible; no code change required, but I will check in an idempotent install snippet in `docs/setup/`.
- I am NOT widening session/safe-word enforcement into code in this phase — it remains an out-of-band cultural check. Phase A scope is "clean up today's noise," not "redesign auth." Logged as a follow-up.

## Actionable checklist
- [ ] Audit codebase for live-order scripts (anything that calls `placeOrder` with `transmit: true` and `dryRun: false`).
- [ ] Add a library helper `requireExplicitLiveOrderIntent()` in `lib/` that aborts unless `OPENCLAW_PLACE_LIVE_ORDER=1` is set in the env. Intended for ad-hoc one-shot scripts.
- [ ] Add an opt-in idempotency-key dedup helper in `lib/`: same key → same outcome, no second broker call. Backed by an on-disk JSON ledger so it survives process restarts within a window.
- [ ] Unit tests: env-gate (set / unset / typo / 0); idempotency dedup (same key short-circuits; different key passes; expired entries fall through).
- [ ] Install `tzdata` for the python3.12 user environment to silence ib_insync traceback. Capture a one-line idempotent snippet in `docs/setup/python-env.md`.
- [ ] Add `plans/follow-ups.md` listing items NOT addressed in this phase.
- [ ] Run new tests + adjacent existing tests until green.
- [ ] Commit and push.

## Acceptance criteria
- Env-gate helper refuses invocation without `OPENCLAW_PLACE_LIVE_ORDER=1`; passes when set; covered by tests.
- Idempotency-key dedup is testable and tested: same key → same outcome, no second broker call.
- Existing live-order code paths continue to work — verified by `scripts/test-basket-lifecycle.js` and `scripts/test-trade-notify-action-currency-normalization.js`.
- `tzdata` is importable from the python user env; setup snippet is checked in and idempotent.
- Plan + helper code + tests committed and pushed.
- `plans/follow-ups.md` lists explicitly-deferred items.
