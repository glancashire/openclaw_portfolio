# STATUS — Portfolio Manager

> Single source of truth for current operational state.

**Last refreshed:** 2026-06-04 20:00 UTC · **Repo head:** `0a294ce` · **Tests:** 254/254 · **Health:** 🟢 healthy

---

## Health at a glance

| Lane | State |
|---|---|
| ETF portfolio read/report path | 🟢 healthy |
| IBKR socket / auth / read | 🟢 green |
| Live order submission | 🟢 unblocked |
| Holdings sync | 🟢 functional |
| Dashboard / report emails | 🟢 healthy |
| Fill-confirmation emails | 🟢 healthy (`monitor-fills` cron disabled by policy) |
| Deposits ledger | 🟢 9 deposits, 140k CHF cumulative |
| Deposits inbox cron | 🟢 wired (`runtime/ibkr-statements/inbox/`) |
| Health monitor | 🟢 escalation-only, persistence + 24h rate-limit |
| Health second-pass autofix | 🟢 5 fixers, 24h per-code rate-limit |
| Sentry error tracking | 🟢 live, weekly autofix Mon 09:00 CET, `event:admin` token |
| Safe-lane verification | 🟢 254 passed, 0 failed, 3 quarantined |
| Cron jobs | 🟢 11 enabled + 1 policy-disabled |

## Open work — at a glance

| Phase | Status | Blocker | Action holder |
|---|---|---|---|
| H2/H3 | CALENDAR | 2026-06-17 review | Graham (decision) |
| F4 + G3 | OPERATOR | XLS file | Graham (drop file) |
| B5 | RECURRING | 2FA prompts | Graham (when alert fires) |
| D1/D2/D3 | PARKED | explicit reactivation | Graham |

**Autonomous engineering ready to execute:** none.

## Operator quick refs

```bash
# Reporting + diagnostics (read-only)
node scripts/show-dashboard.js etf
node scripts/run-health-check.js portfolio/etf
node scripts/fetch-sentry-issues.js --json
node scripts/process-ibkr-statement-inbox.js --portfolio=etf --dry-run

# Cron lifecycle (fill monitor — only during live execution)
openclaw cron enable d4c3207d-9e03-4e98-85eb-2eff38f50d4d
openclaw cron disable d4c3207d-9e03-4e98-85eb-2eff38f50d4d
```

## What shipped 2026-06-04

1. Sentry integration (DSN + API + autofix cron + `resolveIssue` helper)
2. Health-monitor simplification (`state` field, escalation gate, persistence, rate-limit, 4-block email, paste-ready bb8 prompt)
3. Phase I — lifecycle counter, `health-trend.jsonl`, dashboard surfacing
4. Stale order reconciliation + terminal `not_found` classification
5. Fill-monitor cron policy lock-in
6. **Phase G2** — deposits inbox wired into daily-sync cron
7. **Phase J** — second-pass autofix
8. Decisions D-1/D-2/D-3/D-4 closed
