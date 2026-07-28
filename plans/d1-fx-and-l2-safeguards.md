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

### Wave 3 — L2.C multi-party approval for baskets > CHF 25k
- [ ] TBD from map §3 — extend approvalGate; second-channel sign-off
- [ ] Threshold config; basket notional computed for gate
- [ ] Test

### Wave 4 — L2.A file signing + boot tamper check
- [ ] TBD from map §4 — signing util + agent-boot verify hook
- [ ] Sign portfolio.md + memory/*.md; detect + surface tampering
- [ ] Test

### Wave 5 — L2.E DR-drill runbook (doc-only)
- [ ] Monthly disaster-recovery drill procedure in operations runbook

---

## Verification
- Per wave: `npm test` full suite green + pre-commit hook.
- Update PLAN.md L2 checkboxes + this file as each wave ships.
- Update risk-audit recommendation table statuses (#5/9/12/13) as items land.
