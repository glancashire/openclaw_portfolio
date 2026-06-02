# Deferred follow-ups

Items identified but not acted on, with a note on why and what to do later.

---

## 1. `scripts/test-multi-portfolio-overview.js` — slow hot path — PARTIALLY RESOLVED (Phase G, 2026-05-26)
**Identified:** 2026-05-26, during Phase A cleanup.  
**Symptom:** The test consistently takes ~20s. When `npm test` ran it, it appeared to hang, causing the full suite to time-out if a short timeout is set.  
**Root cause (suspected):** A `setTimeout` somewhere in the `generateOverviewArtifacts` / `generateOverviewBoard` pipeline introduces a deliberate delay (possibly a rate-limit backoff or a polling stub).  
**Impact:** Non-blocking for normal operation. The test does pass.  
**Action needed:** Trace the 20s delay and stub it out in tests, or split the slow integration assertion into a separate `test:slow` group.  
**Resolved status:** Phase G added an in-process TTL cache to
`src/reporting/cronJobsFetcher.js`. The test went from 28s → 15s (and
from 11s when the `openclaw` CLI is stubbed). Root cause was 4×
`openclaw cron list --json` spawns at ~2.5s each. Remaining 11s is
legitimate filesystem walking and HTML rendering across many
fixtures; not worth fragmenting the test further unless `npm test`
becomes a strict pre-push gate.

Original action plan (kept for context):
**When to fix:** Before `npm test` is run as a mandatory pre-push gate.

---

## 2. Retired email-reply approval lane (historical note)

This former provider-specific inbound email approval lane was later removed from the live repo. The original code-side work and the planned public-route follow-up are no longer part of the supported operator surface.

---

## 3. Session safe-word not enforced at code level — RESOLVED (Phase D + E, 2026-05-26)

**Resolved:** `src/execution/approvalGate.js` enforces a JSON intent artefact
(`runtime/approval-intent/<id>.json`) signed with safe-word/PIN before any
transmission. `scripts/execute-approved-basket-end-to-end.js` calls
`requireApprovalIntent` and refuses to proceed without it. The operator entry
point `scripts/approve-and-execute.js` writes the artefact then spawns the
runner. Live transmission cannot bypass the gate. See
`docs/setup/approval-gate.md`. 18+27 unit assertions green.

Original action plan (kept for context):
**Identified:** 2026-05-26, after saving `memory/feedback_approval_safeword.md`.  
**Current state:** The safe-word (`shortseller` / PIN `8755`) is honoured by the agent via memory-based recall. There is no code-level gate.  
**Risk:** A future session that doesn't load `feedback_approval_safeword.md` could approve a basket without verifying the safe-word.  
**Action needed:**  
- Add a lightweight JSON approval-intent schema (e.g. in `src/execution/approvalGate.js`) that requires `{ safeWord, pin, approvalId }` to be present and validated before any runner script is invoked.  
- Wire the gate as a pre-flight step into **every `scripts/execute-*` script**, not just `execute-approved-basket-end-to-end.js`. A `--skip-gate` escape hatch may be allowed for dry-run modes that never transmit.  
**When to fix:** Phase B of the auth hardening track; worthwhile before the next Tuesday basket cron.

---

## 4. `ib_insync` FX execution-detail parse emits `tzdata` traceback — RESOLVED
**Resolved:** 2026-05-26 Phase A. `tzdata` installed via `pip install --user --break-system-packages tzdata`. No code change needed. See `docs/setup/python-env.md`.

---

*Last updated: 2026-05-26 (Phase A)*
