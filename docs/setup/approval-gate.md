# Approval gate (Phase D)

Code-level enforcement that `scripts/execute-approved-basket-end-to-end.js`
will not transmit unless an explicit intent artefact, signed with Graham's
safe-word or PIN, is on disk and fresh.

See `memory/feedback_approval_safeword.md` for the safe-word convention and
the threat model. This module is the **enforcement** of that convention.

## Components

### `src/execution/approvalGate.js`
- `requireApprovalIntent({ approvalId, rootDir, env, scriptName, scope,
  maxAgeMinutes })` — call this BEFORE invoking the runner. Throws
  `ApprovalGateError` with `err.code === 'APPROVAL_GATE_DENIED'` on any
  failure. Reasons:
  - `gate_unconfigured` — neither `OPENCLAW_APPROVAL_SAFEWORD` nor
    `OPENCLAW_APPROVAL_PIN` is set in env.
  - `no_intent` — no artefact (or unreadable artefact) for this approvalId.
  - `id_mismatch` — artefact's `approvalId` doesn't match.
  - `scope_mismatch` — artefact's `scope` doesn't match the caller.
  - `stale` — artefact older than `maxAgeMinutes` (default 30), or
    future-dated.
  - `safeword_missing` — artefact has neither `safeWord` nor `pin`.
  - `safeword_mismatch` — supplied safe-word/PIN doesn't match the
    configured env values.
  - `bypass_refused_live` — `OPENCLAW_SKIP_APPROVAL_GATE=1` cannot be
    combined with `OPENCLAW_PLACE_LIVE_ORDER=1`.

- `writeApprovalIntent({ approvalId, rootDir, scope, safeWord, pin,
  issuedAt })` — helper for the approve-and-execute wrapper (Phase E).
  Writes `runtime/approval-intent/<approvalId>.json` with file mode `0600`.

- `consumeApprovalIntent({ approvalId, rootDir })` — deletes the
  intent file after a transmit attempt completes (success, safeguard
  block, or runner exception). Phase L1.A (2026-06-05). Each transmit
  attempt requires its own freshly-minted intent — no reuse within the
  30-min freshness window. Returns `{ deleted: boolean, path, reason? }`.
  Called automatically by `execute-approved-basket-end-to-end.js`.

## Intent artefact shape

```json
{
  "approvalId": "basket-etf-20260603T0944",
  "scope":       "basket-execute",
  "issuedAt":    "2026-06-03T09:45:00.000Z",
  "safeWord":    "<configured safe-word>",
  "pin":         "<configured pin>"
}
```

At least one of `safeWord` / `pin` is required. Both can be present.
The file is written with `0600` perms; the safe-word/PIN never appear in
logs or error messages.

## Env

| Var | Required | Purpose |
|---|---|---|
| `OPENCLAW_APPROVAL_SAFEWORD` | yes* | Configured safe-word. *Either this or the PIN must be set, otherwise the gate refuses with `gate_unconfigured`. |
| `OPENCLAW_APPROVAL_PIN`      | yes* | Configured PIN. |
| `OPENCLAW_SKIP_APPROVAL_GATE` | no  | If `'1'`, gate logs a loud warning and proceeds. **Refused** if `OPENCLAW_PLACE_LIVE_ORDER=1`. |
| `OPENCLAW_PLACE_LIVE_ORDER`  | (existing) | Used by `lib/liveOrderGuard.js`. The approval gate refuses the skip-flag bypass when live transmission is enabled. |

These env values are NEVER persisted to the repo and NEVER logged.

## Wiring

- `scripts/execute-approved-basket-end-to-end.js` — calls
  `requireApprovalIntent` immediately after promoting the proposal,
  before `executeApprovedBasket`. Exit code `4` = gate denial.
- `scripts/execute-trades.js` — stub script that already exits `1`
  before any transmit path. Not gated separately; the stub is a stronger
  block than the safe-word.

## Operator entry point — `scripts/approve-and-execute.js` (Phase E)

The canonical operator entry point. Usage:

```
node scripts/approve-and-execute.js \
  --approval-id=<id> \
  --secret=<safeword-or-pin> \
  [--portfolio=etf] \
  [--scope=basket-execute] \
  [--root=/path/to/workspace] \
  [--dry-run]
```

Behaviour:
1. Compares `--secret` against `OPENCLAW_APPROVAL_SAFEWORD` and
   `OPENCLAW_APPROVAL_PIN`. On no-match → exit 2 (`secret_mismatch`),
   no intent file written, secret NOT echoed.
2. Calls `writeApprovalIntent` with whichever field matched (only one is
   written into the artefact).
3. If `--dry-run`, logs the intent path and exits 0.
4. Otherwise spawns `scripts/execute-approved-basket-end-to-end.js` with
   the resolved portfolio and approvalId, forwarding stdio and exit code.

Exit codes:
- `0` — intent written; runner exited 0 (or dry-run).
- `1` — missing required arg.
- `2` — secret_mismatch or gate_unconfigured.
- `3` — intent write failed.
- `4+` — runner exit code (forwarded).

## Tests

- `scripts/test-approval-gate.js` — 18 assertions covering every reason
  code, both pass paths (safe-word only, PIN only, both), perms, log
  hygiene, malformed JSON, and the live-order bypass refusal.
- `scripts/test-approve-and-execute.js` — 27 subprocess assertions:
  exit codes, intent-file shape, file perms (0600), and the critical
  invariant that the secret never appears in stdout/stderr.

Both wired into `src/reporting/verifyRepoChecks.js`.
