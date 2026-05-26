# Phase F plan — Mailgun inbound webhook handler (code-only)

## Why
The "reply to email" approval path is blocked by the absence of a Mailgun
inbound route on `c3po@mailgun.swift.ch` (see `plans/follow-ups.md` item 2).
Setting up the route itself requires infra work — a public HTTPS endpoint,
DNS, TLS — which is outside the autonomous loop's reach.

What IS in scope autonomously: prepare the **handler module** so that the
moment the operator stands up a webhook endpoint, the verification and
parsing logic is already tested and ready to wire in.

## Threat model
- Mailgun delivers a signed `application/x-www-form-urlencoded` POST
  carrying `timestamp`, `token`, `signature`, plus the inbound message
  fields.
- Without signature verification, anyone with the URL can forge approvals.
- Replay attacks via re-posted Mailgun POSTs.

## Design

New module `lib/mailgunInbound.js`:

### `verifyMailgunSignature({ timestamp, token, signature, signingKey })`
Computes `hmac-sha256(signingKey, timestamp+token)` and compares with
`signature` in constant time. Returns boolean. The signing key comes from
`MAILGUN_WEBHOOK_SIGNING_KEY` env, mirroring the existing
`MAILGUN_API_KEY` pattern in `lib/mailgun.js`.

### `parseInboundApproval({ payload, knownSenders })`
Extracts `{ approvalId, secret, sender, subject, bodyPlain }` from the
Mailgun-shaped payload (form fields). Approval-id detection:
- prefer explicit `approvalId:` line in the body
- fall back to a `re: [approval-id basket-etf-20260603T0944]` style subject
  pattern
- otherwise null

Sender allowlist enforced: `knownSenders` is an array (defaults to
`[c3po@mailgun.swift.ch, glancashire@…]` if env-configured), normalized
to lowercase. Returns `{ allowed: false, reason }` for off-allowlist
senders.

### `acceptInboundApproval({ payload, env, ledgerPath })`
Wraps the two above. Pseudocode:
```
1. verify signature; reject if bad (replay-safe via timestamp window: must
   be within ±5 min of now).
2. parseInboundApproval.
3. dedupe via Mailgun token: if token already in
   runtime/inbound-approvals-ledger.json, reject with 'replay'.
4. write the token + approvalId into the ledger with 24h retention.
5. return { ok: true, approvalId, secret, sender } on success.
```

The handler is **just** a verifier+extractor — it does NOT itself call
`writeApprovalIntent`. A future HTTP server (Phase G) would wire:
`acceptInboundApproval → writeApprovalIntent → spawn runner`.

## Risks / dependencies
- Mailgun's signature format is documented; tests can be deterministic
  by computing a signature from a known signing key.
- Timestamp window: 5 min default, configurable via param. Outside the
  window → reject with `stale_timestamp`.
- Ledger uses the same pattern as `lib/liveOrderGuard.js` idempotency
  ledger (24h retention, failures don't memoise — well, here we DO want
  rejected payloads to NOT pollute the ledger).

## Actionable checklist
- [ ] `lib/mailgunInbound.js` with the three exports above.
- [ ] `scripts/test-mailgun-inbound.js`:
      - valid signature → verify passes; tampered timestamp/token → fails.
      - constant-time comparison (same length, all-mismatched → false).
      - parseInboundApproval extracts approvalId from body / subject /
        returns null when neither present.
      - sender allowlist: off-list sender → allowed=false; on-list →
        allowed=true; case-insensitive match.
      - acceptInboundApproval: happy path returns approvalId + secret;
        replay → 'replay'; tampered signature → 'bad_signature'; out-of-
        window timestamp → 'stale_timestamp'; secret extraction redacted.
      - ledger persists, retention works (synthetic Date).
- [ ] Document in `docs/setup/mailgun-inbound.md`: env vars, payload shape,
      and the infra setup needed to actually use it.
- [ ] Wire into `src/reporting/verifyRepoChecks.js`.
- [ ] Commit + push. Phase F is complete as code; the infra setup is
      tracked as a follow-up.

## Acceptance criteria
- All unit-test scenarios pass.
- Signature verification uses `timingSafeEqual` (or equivalent) to avoid
  timing attacks.
- Replay prevention works via Mailgun's `token` field.
- Secret/safe-word from the message body never appear in logs.
- Doc clearly states this is code-only and lists the infra still required.
