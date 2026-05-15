# Report delivery policy

This repo now defines a local-only production reporting policy so operators can validate reporting posture without causing any real outbound delivery side effects.

## Current default policy
- Delivery mode: `local_only`
- Intended channels: repo artifacts only (`dashboard.md`, Markdown report, JSON workflow output)
- External delivery enabled: no
- Email provider metadata: `mailgun` (capability modeled, still disabled by policy by default)
- Email recipients: empty by default
- Failure alert mode: `local_operator_review`
- Failure alert targets: dashboard, Markdown report, report-cycle JSON output

## Why this policy exists
- It makes delivery expectations explicit instead of implied.
- It keeps verification safe: no email, chat, webhook, or broker side effects are triggered by report generation.
- It lets future external delivery be layered on deliberately, with separate approval and side-effect review.

## Pending-action semantics
The reporting surfaces now treat the following as operator-facing pending actions by default:
- dashboard/report freshness is stale relative to source state
- failed trade rows exist
- staged/submitted/partially-filled rows still need reconciliation
- broker automation is paused after repeated broker errors
- report rendering required fallback handling
- a report-cycle workflow step failed

## Local readiness check
Run:

```bash
node scripts/check-report-delivery-readiness.js portfolio/etf
```

This returns JSON describing:
- effective policy
- freshness posture
- execution lifecycle summary
- broker automation pause state
- pending operator actions
- whether the current delivery posture is considered `ready`

## Future email-capable modes
The policy model can now distinguish between:
- `local_only`
- `email_only`
- `email_and_repo`

Email delivery is still treated as an explicit external side effect and is not considered ready unless:
- email mode is enabled,
- one or more `emailRecipients` are configured,
- provider config is present,
- and delivery pending-actions are clear.

## Enabling live email safely
1. Confirm delivery state is clear:
   - `node scripts/check-report-delivery-readiness.js portfolio/etf`
   - `node scripts/check-email-delivery-readiness.js portfolio/etf`
2. Set policy mode in `config/report_delivery_policy.json` to either:
   - `email_only` for outbound email only, or
   - `email_and_repo` for email plus repo artifacts
3. Set `externalDeliveryEnabled: true`.
4. Set `emailRecipients` to the intended recipients, for example `[
  "lancashire@swift.ch"
]`.
5. Verify Mailgun secrets are present through `.env` or `secrets/mailgun.json`.
6. Send one verification email:
   - `node scripts/send-email-verification.js portfolio/etf`

## Policy override file
Machine-readable policy lives at:

- `config/report_delivery_policy.json`

It is still expected to remain side-effect-free by default unless the operator explicitly changes the delivery mode/config above.
