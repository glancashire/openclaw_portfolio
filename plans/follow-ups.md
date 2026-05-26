# Deferred follow-ups

Items identified but not acted on, with a note on why and what to do later.

---

## 1. `scripts/test-multi-portfolio-overview.js` — 20-second hot path (low priority)
**Identified:** 2026-05-26, during Phase A cleanup.  
**Symptom:** The test consistently takes ~20s. When `npm test` ran it, it appeared to hang, causing the full suite to time-out if a short timeout is set.  
**Root cause (suspected):** A `setTimeout` somewhere in the `generateOverviewArtifacts` / `generateOverviewBoard` pipeline introduces a deliberate delay (possibly a rate-limit backoff or a polling stub).  
**Impact:** Non-blocking for normal operation. The test does pass.  
**Action needed:** Trace the 20s delay and stub it out in tests, or split the slow integration assertion into a separate `test:slow` group.  
**When to fix:** Before `npm test` is run as a mandatory pre-push gate.

---

## 2. No Mailgun inbound route for `c3po@mailgun.swift.ch` (medium priority)
**Identified:** 2026-05-26, when Graham was asked to "reply to the email" as an approval path.  
**Symptom:** Mailgun `events` API returns zero inbound events for that address; there is no configured route in Mailgun's Receiving panel.  
**Impact:** "Reply to my email" cannot be used as an approval/auth signal until a route is set up.  
**Action needed:**  
1. In Mailgun dashboard → Receiving → Create route: expression `match_recipient("c3po@mailgun.swift.ch")`, action `forward("https://<openclaw-host>/webhooks/mailgun")` (or a webhook URL the gateway can handle).  
2. Verify the gateway's `mailgun.inboundWebhookSecret` config field is set.  
3. Write a small integration test that POSTs a Mailgun-signed inbound payload to the webhook and verifies the gateway parses it.  
**When to fix:** Before "reply to email" is offered as an approval path to the user.

---

## 3. Session safe-word not enforced at code level (medium priority)
**Identified:** 2026-05-26, after saving `memory/feedback_approval_safeword.md`.  
**Current state:** The safe-word (`shortseller` / PIN `8755`) is honoured by the agent via memory-based recall. There is no code-level gate.  
**Risk:** A future session that doesn't load `feedback_approval_safeword.md` could approve a basket without verifying the safe-word.  
**Action needed:**  
- Add a lightweight JSON approval-intent schema (e.g. in `src/execution/approvalGate.js`) that requires `{ safeWord, pin, approvalId }` to be present and validated before any runner script is invoked.  
- Wire the gate into `scripts/execute-approved-basket-end-to-end.js` as a pre-flight step when not running in `--skip-gate` mode.  
**When to fix:** Phase B of the auth hardening track; worthwhile before the next Tuesday basket cron.

---

## 4. `ib_insync` FX execution-detail parse emits `tzdata` traceback — RESOLVED
**Resolved:** 2026-05-26 Phase A. `tzdata` installed via `pip install --user --break-system-packages tzdata`. No code change needed. See `docs/setup/python-env.md`.

---

*Last updated: 2026-05-26 (Phase A)*
