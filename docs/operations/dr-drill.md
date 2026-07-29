# Disaster-recovery drill runbook (L2.E)

A monthly, ~30-minute rehearsal that proves this workspace can be rebuilt and
that its safety gates still hold. Run it read-only where possible; the drill
itself must never transmit a live order.

Cadence: first business day of each month. Log the run in `memory/YYYY-MM-DD.md`.
Owner: operator (Graham) with bb8 driving the checks.

The drill has five parts. Do them in order — each proves a different recovery
layer. Stop and file a blocker if any part fails; don't paper over it.

---

## Part 1 — Secrets & env recoverability (5 min)

The workspace `.env` is the only file that can't be regenerated from git.

1. Confirm the daily backup cron is producing snapshots:
   ```
   ls -t runtime/env-backups/ | head
   ```
   Expect a `.env.latest` plus a same-day timestamped `.env.YYYYMMDDTHHMMSSZ`.
2. Confirm the helper still runs clean (idempotent, prints no secrets):
   ```
   bash scripts/ops/backup-workspace-env.sh
   ```
   Expect `{"ok":true,...}`. `env_missing` → the `.env` is gone; restore from the
   newest snapshot before doing anything else.
3. Spot-check a snapshot has the expected **key names** only (never echo values):
   ```
   cut -d= -f1 runtime/env-backups/.env.latest | sort
   ```
   Expect at minimum `GITHUB_PAT`, `OPENCLAW_PORTFOLIO_SIGNING_KEY` (once L2.A is
   armed), and broker/market-data keys. A missing key name is the blocker.

**Recovery rehearsal:** copy `.env.latest` to a scratch path, diff key names
against the live `.env`, confirm identical. Do not overwrite the live `.env`.

---

## Part 2 — Code & control-file recoverability (5 min)

1. Confirm the working tree is clean and pushed:
   ```
   git status --short
   git log --oneline -1 && git rev-parse origin/master
   ```
   Local `HEAD` should equal `origin/master`. Uncommitted control-file edits are a
   blocker — commit or revert before the drill continues.
2. Rehearse a clean rebuild in a scratch dir (proves the remote is sufficient):
   ```
   git clone https://github.com/glancashire/openclaw_portfolio.git /tmp/dr-clone
   cd /tmp/dr-clone && npm ci --silent && npm run verify
   cd - && rm -rf /tmp/dr-clone
   ```
   Expect `verify` EXIT 0. A fresh clone that can't verify means the repo alone
   can't reconstitute the system — file a blocker.

---

## Part 3 — Broker-connection recovery (5 min)

This reuses the existing IBKR ladder; the drill only confirms the ladder still
diagnoses correctly.

1. ```
   node scripts/ibkr-fast-status.js; echo "exit=$?"
   ```
   Map the exit code against `docs/operations/ibkr-recovery.md` (0 healthy … 4
   quote posture degraded). Whatever it reports, confirm the runbook's stated next
   step matches reality.
2. Do **not** restart a healthy gateway. Per TOOLS.md, if `:4001` is already
   listening, a second `start-ibc.sh` loses the collision — never fire it as a
   "drill step". Recovery of a *down* gateway is rehearsed only when it's actually
   down.

---

## Part 4 — Safety-gate integrity (10 min)

Prove every hard gate still fails safe. All checks are read-only.

1. **Tamper detection (L2.A).** With the signing key set:
   ```
   node scripts/sign-portfolio.js verify etf
   ```
   Expect `verified` (or `disabled`/`unsigned` if not yet armed — both fail open).
   Then rehearse detection on a scratch copy: sign it, edit a byte, verify →
   expect `tampered` exit 2. Never edit the live `portfolio.md` for this.
2. **Daily-loss circuit breaker (L2.B).** Confirm baseline + trip logic:
   ```
   node scripts/test-daily-loss-circuit-breaker.js; echo "exit=$?"
   ```
   Baseline lives at `runtime/circuit-breaker/<portfolio>/nlv-baseline.json`.
   A tripped breaker freezes transmit; clear only via `scripts/clear-circuit-breaker.js`
   after operator review.
3. **Multi-party co-sign (L2.C).** Confirm the ≥ CHF 25k co-sign gate holds:
   ```
   node scripts/test-multi-party-approval.js; echo "exit=$?"
   ```
4. **Approval gate + safe-word.** Confirm the approval path still requires the
   safe-word + PIN (see `memory/feedback_approval_safeword.md`). Do not paste the
   safe-word into the drill log.

All four must pass. Any failure is a P1 blocker — the system could transmit
without a working gate.

---

## Part 5 — Reconciliation truthfulness (5 min)

1. FX cash reconciliation (D1) — confirm multi-currency sleeves reconcile and
   CHF totals are unchanged:
   ```
   node scripts/test-holdings-fx-reconciliation.js; echo "exit=$?"
   ```
2. Dashboard freshness — confirm the console view renders and quote-provider
   health is truthful:
   ```
   node scripts/show-dashboard.js etf
   ```
   Check the `📡 Quote providers` block flags any cooling-down/failing provider.

---

## Closing the drill

- Record in `memory/YYYY-MM-DD.md`: date, each part's pass/fail, any blocker, and
  the `origin/master` SHA the drill ran against.
- If everything passed, note "DR drill green @ <sha>".
- File any blocker as its own task; don't let a red drill sit unremediated to the
  next month.

## Explicitly out of scope for the drill
- Transmitting any order (live or paper) — the drill is read-only.
- Restarting a healthy IBKR gateway.
- Overwriting the live `.env` or `portfolio.md`.
- Printing secret values or the approval safe-word.
