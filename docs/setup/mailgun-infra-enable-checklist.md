# Mailgun inbound infrastructure enablement checklist

Last updated: 2026-05-30 UTC

## Status
Blocked on external infrastructure and public reachability.

The code-side verifier/extractor already exists:
- `lib/mailgunInbound.js`
- `scripts/test-mailgun-inbound.js`
- `docs/setup/mailgun-inbound.md`

This checklist is the execution-ready handoff for completing the remaining infrastructure lane.

## External prerequisites
- A Mailgun domain/account with inbound routing enabled
- A public HTTPS endpoint that can receive Mailgun webhook POSTs
- Access to the gateway/runtime environment to set the signing secret
- A reachable path from Mailgun to the OpenClaw host (direct host, reverse proxy, or tunnel)

## Required external setup

### 1) Create the Mailgun receiving route
Recommended expression:
```text
match_recipient("c3po@mailgun.swift.ch")
```

Recommended action:
```text
forward("https://<public-openclaw-endpoint>/webhooks/mailgun")
```

If the final inbound address changes, update the route expression and the operator documentation together.

### 2) Expose a public HTTPS endpoint
Requirements:
- TLS-valid HTTPS URL
- reachable from Mailgun
- forwards inbound POST bodies intact
- preserves headers/body needed for Mailgun signature verification

### 3) Configure the signing secret
Required secret/input:
- `MAILGUN_WEBHOOK_SIGNING_KEY` for the verifier implementation

If/when this moves into OpenClaw-managed config instead of env, set the equivalent canonical config field through the proper config path rather than ad hoc file edits.

## Repo-side verification sequence
Run these after the external path exists.

### Local contract/regression verification
```bash
node scripts/test-mailgun-inbound.js
```

Expected outcome:
- signature verification still passes
- malformed payload cases still fail closed
- extraction behavior remains stable

### End-to-end signed webhook verification
Execute a signed POST against the public endpoint and verify that:
- the request is accepted
- signature validation succeeds
- the payload is parsed into the expected internal structure
- failure cases are observable and explicit

Minimum acceptance evidence:
- successful signed request sample
- rejected invalid-signature sample
- operator-visible log/evidence confirming the path used the configured signing secret

## Operator handoff checklist
- [ ] Mailgun route created
- [ ] Public HTTPS endpoint reachable from Mailgun
- [ ] Signing key configured in runtime
- [ ] `node scripts/test-mailgun-inbound.js` green
- [ ] Real signed POST verified end-to-end
- [ ] Failure case verified with invalid signature
- [ ] Docs updated if public endpoint or recipient changed

## Non-goals
This lane does **not** include:
- changing approval policy by itself
- auto-approving anything from inbound email
- bypassing existing execution or approval gates
- inventing an HTTP server path that does not actually exist yet

## Recommendation
Keep this lane marked as blocked infra until the public endpoint and secret path are truly available. Once they are, the above sequence should be enough to finish the lane quickly without rediscovery.
