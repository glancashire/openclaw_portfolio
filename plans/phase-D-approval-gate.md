# Phase D plan — Code-level approval gate (safe-word + PIN)

## Why
The safe-word + PIN convention saved in `memory/feedback_approval_safeword.md`
is enforced today only by agent recall. If a future session doesn't load that
memory, nothing at the code level prevents a runner script from invoking
`executeApprovedBasket` against a stale, fabricated, or replayed approvalId.

Per Graham (2026-05-26 14:58 UTC), the gate covers **all `scripts/execute-*`
scripts** — not just `execute-approved-basket-end-to-end.js`.

## Threat model
- "Stray click / replay" of an old approval envelope from a session that
  doesn't remember the safe-word was set.
- An automation calling the runner without an explicit operator intent
  artefact.

Out of scope: a malicious operator who *has* the safe-word (the safe-word is
friction for accidents, not authentication against a determined human).

## Design

A small `src/execution/approvalGate.js` module exports
`requireApprovalIntent({ approvalId, rootDir, env, scriptName })` which:

1. Looks for `runtime/approval-intent/<approvalId>.json` (intent artefact).
2. The artefact MUST contain:
   - `approvalId`: string, must match the argument.
   - `safeWord` OR `pin`: at least one must match the configured value.
   - `issuedAt`: ISO-8601 timestamp, not older than `maxAgeMinutes` (default 30).
   - `scope`: `"basket-execute"` or `"trades-execute"` (must match the
     caller's script).
3. If `OPENCLAW_SKIP_APPROVAL_GATE='1'` is set, the gate logs a loud warning
   and proceeds (this is the documented escape hatch for dry-run-only
   modes that never transmit). The gate refuses to honour the bypass when
   `OPENCLAW_PLACE_LIVE_ORDER='1'` is also set — live transmission cannot
   skip the gate.
4. The configured safe-word/PIN come from env:
   - `OPENCLAW_APPROVAL_SAFEWORD` (default: undefined → gate refuses)
   - `OPENCLAW_APPROVAL_PIN`
   These are populated outside the repo (operator's machine env or
   secret-store). They are NEVER logged.

On failure, the gate throws with `err.code = 'APPROVAL_GATE_DENIED'` and
`err.reason` ∈ { `no_intent`, `id_mismatch`, `stale`, `scope_mismatch`,
`safeword_missing`, `safeword_mismatch`, `gate_unconfigured` }.

## Risks / dependencies
- Existing test scripts that invoke `execute-approved-basket-end-to-end.js`
  in dry-run mode must still pass. Use `OPENCLAW_SKIP_APPROVAL_GATE=1` in
  CI runs that don't transmit.
- The Tuesday basket cron must populate the intent artefact before invoking
  the runner. The intent artefact creation step itself is NOT part of this
  phase — the gate is enforce-only; a follow-up will add an
  `approve-and-execute.js` wrapper that writes the artefact then invokes the
  runner.

## Actionable checklist
- [ ] `src/execution/approvalGate.js` with `requireApprovalIntent({...})`
      and `writeApprovalIntent({...})` (helper for the wrapper script).
- [ ] `scripts/test-approval-gate.js` — unit tests covering:
      no intent → throws no_intent; wrong id → id_mismatch;
      stale intent → stale; wrong scope → scope_mismatch; missing
      safeWord+pin → safeword_missing; wrong safeWord → safeword_mismatch;
      correct safeWord-only → pass; correct pin-only → pass; both → pass;
      `OPENCLAW_SKIP_APPROVAL_GATE=1` with live-order on → still refuses;
      `OPENCLAW_SKIP_APPROVAL_GATE=1` without live-order → warning + pass.
- [ ] Wire `requireApprovalIntent` into `scripts/execute-approved-basket-end-to-end.js`
      and `scripts/execute-trades.js` (the latter is currently a stub that
      exits 1, but gate it anyway as defence-in-depth).
- [ ] Wire `src/reporting/verifyRepoChecks.js`.
- [ ] Document the artefact shape in `docs/setup/approval-gate.md` + cross-link
      from `memory/feedback_approval_safeword.md`.
- [ ] Confirm dry-run tests still green with `OPENCLAW_SKIP_APPROVAL_GATE=1`.
- [ ] Commit + push.

## Acceptance criteria
- `scripts/execute-*` cannot transmit without a valid intent artefact (or
  the gate-bypass flag and `OPENCLAW_PLACE_LIVE_ORDER` not set).
- All unit-test scenarios pass.
- Adjacent suites (live-order-guard, basket-lifecycle, dashboard-digest)
  still green.
- Safe-word / PIN never appear in logs or error messages.

## Cron / artefact creation (follow-up, NOT part of Phase D)
After Phase D lands, the Tuesday cron will need a tiny `approve-and-execute.js`
wrapper that:
1. Verifies the operator's approval message (webchat) contains the safe-word
   or PIN.
2. Writes `runtime/approval-intent/<approvalId>.json` with `{ approvalId,
   safeWord OR pin, issuedAt, scope }`.
3. Invokes the existing runner.
This wrapper is the natural "Phase E" item.
