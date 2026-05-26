# Mailgun inbound webhook handler (code-only)

`lib/mailgunInbound.js` provides the verification + extraction logic for
a Mailgun inbound webhook POST. **There is no HTTP server in the
workspace.** This module is the "ready to plug in" half of the
"reply-to-email approval" path. The other half (a public HTTPS endpoint)
is infra work and is **not yet set up**.

## API

```js
const { verifyMailgunSignature, parseInboundApproval, acceptInboundApproval }
  = require('lib/mailgunInbound');
```

### `verifyMailgunSignature({ timestamp, token, signature, signingKey })`
Returns `true` iff the Mailgun signature matches
`hmac-sha256(signingKey, timestamp + token)`. Constant-time comparison.

### `parseInboundApproval({ payload, knownSenders })`
Extracts `{ approvalId, secret, matched, sender, subject, bodyPlain,
allowed, reason }` from a Mailgun-shaped payload.

- `approvalId`: from body line `approvalId: …` (preferred); falls back to
  a `[basket-…]` token in the subject.
- `secret` / `matched`: from `safeWord: …` (preferred) or `pin: …` line in
  the body. `matched` is `'safeWord'` or `'pin'`.
- `allowed`: false (with `reason='sender_not_allowed'`) if `knownSenders`
  is non-empty and the sender isn't on it (case-insensitive match).

### `acceptInboundApproval({ payload, env, knownSenders, ledgerPath, ... })`
The full verify → window check → allowlist → extract → dedupe pipeline.

Returns `{ ok, approvalId, secret, matched, sender, reason }`. Reasons on
failure:

| `reason` | Cause |
|---|---|
| `gate_unconfigured`  | `MAILGUN_WEBHOOK_SIGNING_KEY` env not set |
| `bad_signature`      | HMAC mismatch |
| `stale_timestamp`    | Timestamp older or newer than ±5 min |
| `sender_not_allowed` | Sender not in `knownSenders` |
| `no_approval_id`     | Couldn't extract approvalId from body/subject |
| `no_secret`          | Couldn't extract safeWord or pin from body |
| `replay`             | Mailgun token already seen (24h retention) |

The ledger lives at `runtime/inbound-approvals-ledger.json` by default
(configurable via `ledgerPath`).

## Env

| Var | Purpose |
|---|---|
| `MAILGUN_WEBHOOK_SIGNING_KEY` | The signing key from the Mailgun dashboard. |
| `MAILGUN_INBOUND_ALLOWED_SENDERS` | Comma-separated allowlist. Override per call by passing `knownSenders`. |

## Tests

`scripts/test-mailgun-inbound.js` — 41 assertions:
signature verification (valid, missing args, wrong key, tampered token,
tampered timestamp, length mismatch); parser (body, subject fallback,
PIN extraction, allowlist on/off, case-insensitive, missing fields);
accept (happy, replay via token, bad signature, stale timestamp, bad
sender, missing approvalId, missing secret, gate unconfigured); ledger
retention (synthetic clock).

Wired into `src/reporting/verifyRepoChecks.js`.

## Infra still required (NOT in this phase)

To make "reply to email" an actual auth channel, after this module:

1. Stand up a public HTTPS endpoint that accepts POST
   `application/x-www-form-urlencoded` from Mailgun. Likely on the
   gateway host that already has a public IP, behind a reverse proxy
   with a TLS cert.
2. In Mailgun → Receiving → Routes, create:
   - Expression: `match_recipient("c3po@mailgun.swift.ch")`
   - Action: `forward("https://openclaw-host.example/webhooks/mailgun")`
3. Configure `MAILGUN_WEBHOOK_SIGNING_KEY` in the env on the gateway host.
4. Wire a thin HTTP handler around `acceptInboundApproval` that, on
   `ok=true`, calls `src/execution/approvalGate.writeApprovalIntent`
   then spawns `scripts/execute-approved-basket-end-to-end.js` (or
   `scripts/approve-and-execute.js` — pick the right entry point).

This module is intentionally framework-free so it can be hosted under
Express, Fastify, raw `http.createServer`, AWS Lambda, etc.
