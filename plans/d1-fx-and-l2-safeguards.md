# Plan — D1 (FX cash reconciliation) + L2 (capital-gated safeguards)

**Opened:** 2026-07-28 · **Driver:** Graham said "d1fx l2" — reactivate D1 and start Phase L2.
**Codebase map:** `plans/d1-l2-codebase-map.md` (subagent, read-only) — authoritative for integration points.

Safety posture unchanged: ETF-only, CHF-first, approval-gated live execution. No commits without Graham's ask (he asked to work through the plan + commit/push in prior waves; keep committing per-wave with green verify). Everything here is defensive hardening — no new transmit paths.

---

## Scope decision

| Item | Include this wave? | Why |
|---|---|---|
| **D1** FX cash reconciliation | ✅ yes | Explicitly reactivated. Refresh/verify FX at reconcile + flag envelope-time vs transmit-time drift. |
| **L2.A** File signing + tamper detection | ✅ yes | Pure-local, high-value, no capital gate needed. |
| **L2.B** Daily-loss circuit breaker | ✅ yes | Analogous to shipped L1.B daily transmit cap; freeze transmit on intra-day NLV drop. |
| **L2.C** Multi-party approval (>CHF 25k) | ✅ yes | Second sign-off from a different channel; extends existing approval gate. |
| **L2.D** YubiKey / hardware safe-word | ⛔ defer | Operator hardware + only worth it >CHF 500k per audit. |
| **L2.E** Monthly DR drill | ✅ doc-only | Operations runbook addition; no code. |

---

## Wave plan (each wave: implement → new test → regen manifest → full verify green → commit → push)

### Wave 1 — D1 FX cash reconciliation ✅ DONE (2026-07-28)
- [x] New `src/brokers/shared/cashReconciliation.js`: `extractCashByCurrency` + `reconcileCash` + `formatCashReconciliationSection`
- [x] Wired additively into `holdingsSnapshot.js` (optional `cashReconciliation` → appended section, canonical CHF totals untouched) and `holdingsSync.js` (computed from live ledger + `liveFxRates`)
- [x] Flags: `chf_cash_drift`, `non_chf_cash`, `missing_fx`; drift vs legacy CHF-only path surfaced
- [x] Test `scripts/test-cash-reconciliation.js` (21 asserts) + FX regression green; full suite 353/353

### Wave 2 — L2.B daily-loss circuit breaker ✅ DONE (2026-07-28)
- [x] New `src/execution/dailyLossCircuitBreaker.js`: start-of-day NLV baseline (per-UTC-day, sticky) + `evaluateDailyLossCircuitBreaker` returning L1.B-style `{ok, code, reason, ...}`
- [x] Wired into `basketExecutionRunner.js` right after the daily transmit cap, before the leg loop — transmit-freeze only, never sells; injectable `currentNlvChf`/`fetchNlvChf` via `safeguardConfig`
- [x] Threshold: pct (default 8%) OR absolute CHF floor, whichever trips first; `skipDailyLossBreaker` escape hatch
- [x] Test `scripts/test-daily-loss-circuit-breaker.js` (19 asserts incl. runner integration) + manifest regen; full suite 354/354 green

### Wave 3 — L2.C multi-party approval for baskets > CHF 25k ✅ DONE (2026-07-28)
- [x] Extended `approvalGate.js` `requireApprovalIntent` additively: new `notionalChf` param; baskets ≥ threshold (default CHF 25k, override `OPENCLAW_MULTI_PARTY_THRESHOLD_CHF`) require a `secondParty` attestation
- [x] Second approver has own credentials (`OPENCLAW_APPROVAL_SECOND_SAFEWORD`/`_PIN`) and MUST originate from a channel distinct from the primary (`cosign_same_channel` guard); co-sign freshness enforced
- [x] `writeApprovalIntent` persists optional `channel` + `secondParty`; `execute-approved-basket-end-to-end.js` computes basket CHF notional and passes it into the gate
- [x] Denial reasons: `cosign_unconfigured`, `cosign_missing`, `cosign_mismatch`, `cosign_channel_missing`, `cosign_same_channel`, `cosign_stale`; never leaks credentials
- [x] Test `scripts/test-multi-party-approval.js` (17 asserts) + existing gate test back-compat green; manifest regen; full suite 355/355

### Wave 4 — L2.A file signing + tamper detection ✅ DONE (2026-07-29)
- [x] `src/execution/portfolioSigning.js`: HMAC-SHA256 sign/verify of control files (default `portfolio.md`). Fail-open states `disabled`/`unsigned`/`verified`; only positive `tampered` blocks. Key from `OPENCLAW_PORTFOLIO_SIGNING_KEY` env — never persisted/printed; manifest stores sig+bytes, no content.
- [x] Wired additively into `evaluateExecutionPolicy` (portfolioExecution.js) as a **live-only** blocker (`portfolio_tamper` code); unsigned setups unaffected. `requireTrustedPortfolio` available for hard preflight.
- [x] `scripts/sign-portfolio.js` operator CLI (`sign`/`verify`); exit 2 only on tamper.
- [x] Test `scripts/test-portfolio-signing.js` (18 asserts: disabled/unsigned/verified/tampered/missing/wrong-key/enforcement). Manifest regen → 356. Full verify green.

### Wave 5 — L2.E DR-drill runbook (doc-only)
- [ ] Monthly disaster-recovery drill procedure in operations runbook

---

## Verification
- Per wave: `npm test` full suite green + pre-commit hook.
- Update PLAN.md L2 checkboxes + this file as each wave ships.
- Update risk-audit recommendation table statuses (#5/9/12/13) as items land.
