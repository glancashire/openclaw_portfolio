# STATUS — Portfolio Manager

> Single source of truth for current operational state.

**Last refreshed:** 2026-07-28 21:23 UTC · **Repo head:** `711422d` · **Tests:** 350 discovered (265 safe, 3 quarantined) · **Health:** 🟢 healthy

---

## Health at a glance

| Lane | State |
|---|---|
| ETF portfolio read/report path | 🟢 healthy |
| IBKR socket / auth / read | 🟢 green (master `glancashire` on `:4001`) |
| Live order submission | 🟢 unblocked |
| Holdings sync | 🟢 functional |
| Dashboard / report emails | 🟢 healthy |
| Fill-confirmation emails | 🟢 healthy (`monitor-fills` cron disabled by policy) |
| Deposits ledger | 🟢 10 deposits, CHF 150k cumulative |
| Cash sleeve | 🟢 ~CHF 209 (0.1%) — effectively fully deployed after R2SC |
| Deposits inbox cron | 🟢 wired (`runtime/ibkr-statements/inbox/`) |
| Health monitor | 🟢 escalation-only, persistence + 24h rate-limit |
| Health second-pass autofix | 🟢 5 fixers, 24h per-code rate-limit |
| Sentry error tracking | 🟢 live, weekly autofix Mon 09:00 CET, `event:admin` token |
| Safe-lane verification | 🟢 255 passed, 0 failed, 3 quarantined (fixture clock-drift resolved 2026-06-15) |
| Pre-flight order safeguards | 🟢 SELL/BUY price floor+ceiling, notional caps, stale-quote, sellApproved gate, BUY trend guard |
| IBKR tick-size conformance | 🟢 limit prices resolved from live market rules, not flat minTick (Phase M, 2026-06-15) |
| Daily transmit cap | 🟢 CHF 50k/day across all baskets (Phase L1.B) |
| Approval intent | 🟢 consumed after every transmit attempt (Phase L1.A, no reuse window) |
| Cron tool grants | 🟢 no live cron job carries `write`/`edit` (Phase L1.C) |
| Cron jobs | 🟢 11 enabled + 1 policy-disabled |

## Open work — at a glance

| Phase | Status | Blocker | Action holder |
|---|---|---|---|
| **220** | **DONE 2026-07-28** — performance windows + quote-service layer (health/cache/provenance) shipped & pushed | **none** | **—** |
| **Quote svc B/C** | PENDING — console provider-health block + local daemon boundary | none | bb8 (queued) |
| **M** | **DONE 2026-06-15** — R2SC filled + market-rule tick resolver shipped | **none** | **—** |
| **L** | **L0 + L1.A–L1.D done; L1.E CLOSED won't fix 2026-06-11** | **none** | **—** |
| H2/H3 | CALENDAR | 2026-06-17 review | Graham (decision) |
| F4 + G3 | OPERATOR | XLS file | Graham (drop file) |
| B5 | RECURRING | 2FA prompts | Graham (when alert fires) |
| D1/D2/D3 | PARKED | explicit reactivation | Graham |

**Shipped 2026-06-05 → 2026-07-28:** Phase K (energy sleeve filled), Phase L0 (pre-flight safeguards), Phase L1.A–L1.D (intent cleanup, daily cap, cron tightening, trend guard), Phase L1.E **CLOSED won't fix** 2026-06-11, Phase M (R2SC small-cap sleeve filled + IBKR market-rule tick resolver) 2026-06-15, **Phase 220** (dashboard return-metrics cleanup + performance windows with per-metric availability + `src/quotes/` service layer: ordered provider fallback, health/cooldown, TTL cache, quote provenance/age surfacing) 2026-07-28.

**Next queued:** quote-service Phase B (console `show-dashboard.js` provider-health block — the service already snapshots health via `snapshotProviderHealth`, only the console surface is missing) + Phase C (extract to a long-lived daemon boundary while keeping the in-process API stable). Plan: `plans/quote-service-remaining.md`.

Full plan: `PLAN.md`. Risk audit: `docs/risk-audit-2026-06-05.md`. L1.E close-out: `memory/2026-06-11.md`. Phase M tick-size doc: `docs/operations/ibkr-tick-sizes.md`.

## Active research thread (Phase K — energy + nuclear sleeve)

| Doc | Purpose |
|---|---|
| `docs/research/energy-nuclear-screening-2026-06-04.md` | Initial UCITS shortlist with TER, replication, Acc filters |
| `docs/research/energy-nuclear-preflight-2026-06-04.md` | IBKR conid + venue + AUM + close-snap quote verification |
| `docs/research/k-series-energy-sleeve-stub.md` | K1–K4 phase plan, parked until Graham commits |
| `scripts/probe-energy-etf-quotes.js` | Read-only live-hours bid/ask probe |
| Cron `141064ee` | One-shot Fri 2026-06-05 13:00 UTC live-hours probe, self-deletes |

**Final shortlist:** XDWE (Xetra EUR), NUCL (SIX CHF 🌟 native), INRE (Paris EUR).

## Operator quick refs

```bash
# Reporting + diagnostics (read-only)
node scripts/show-dashboard.js etf
node scripts/run-health-check.js portfolio/etf
node scripts/fetch-sentry-issues.js --json
node scripts/process-ibkr-statement-inbox.js --portfolio=etf --dry-run
node scripts/probe-energy-etf-quotes.js                # live-hours quote probe

# Cron lifecycle (fill monitor — only during live execution)
openclaw cron enable d4c3207d-9e03-4e98-85eb-2eff38f50d4d
openclaw cron disable d4c3207d-9e03-4e98-85eb-2eff38f50d4d
```

## What shipped 2026-06-04

1. Sentry integration (DSN + API + autofix cron + `resolveIssue` helper)
2. Health-monitor simplification (state field, escalation gate, persistence, rate-limit, 4-block email, paste-ready bb8 prompt)
3. Phase I — lifecycle counter, `health-trend.jsonl`, dashboard surfacing
4. Stale order reconciliation + terminal `not_found` classification
5. Fill-monitor cron policy lock-in
6. **Phase G2** — deposits inbox wired into daily-sync cron
7. **Phase J** — second-pass autofix
8. Decisions D-1/D-2/D-3/D-4 closed
9. **Energy + nuclear research** — screening + preflight + K-series stub + Friday probe cron
