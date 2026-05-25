# Phase 165 — Live email enablement and transport verification

## Goal
Create a safe, explicit, test-backed path for turning on real outbound email delivery for this repo, including readiness checks, config documentation, and a transport verification flow that proves Mailgun can deliver without bypassing the policy model.

## Scope
- Add a canonical email-readiness CLI that reports policy mode, recipient config, provider config, and current send readiness together.
- Add explicit operator docs for enabling `email_only` / `email_and_repo` safely.
- Add a controlled transport-verification script that sends a test email through the canonical stack when policy/config are intentionally ready.
- Add focused tests for readiness reporting and transport-verification guardrails.
- If the repo is already fully configured, enable real email policy for `lancashire@swift.ch` and verify with a live test message.

## Non-goals
- No hidden bulk rollout or cron automation in this phase.
- No silent delivery enablement without passing readiness checks first.
- No changes to broker execution behavior.

## Safety notes
- A live test email is an external side effect, but the user explicitly requested implementation and enablement of email delivery.
- Use the canonical policy layer; do not bypass it with raw provider calls except through the existing provider adapter.
- Keep the test message obviously marked as a verification email.

## Verification plan
- Add tests for the readiness CLI and verification guardrails.
- Re-run delivery/email-focused regression checks.
- If readiness is clear, send one live verification email and confirm the provider response.
