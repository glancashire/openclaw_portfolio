# Audit — IBKR MCP read layer + FX drift (2026-08-06 → 07)

**Author:** bb8 · **Date:** 2026-08-07 · **Status:** MCP layer SHIPPED (live); FX fix DESIGNED (not yet built)

This audit consolidates the work and findings from the 2026-08-06 session: an IBKR
native-gateway recovery, standing up the new IBKR hosted **MCP** read layer, and a
root-cause of the recurring dashboard-vs-broker FX drift.

---

## 1. IBKR native gateway recovery (2026-08-06) — DONE

**Symptom:** `:4001` down (`ECONNREFUSED`), readiness red, dashboard health 🔴 critical
for 13 cycles since 2026-08-02.

**Root cause:** three stale/duplicate IB Gateway JVMs (Jul 31 / Aug 1 / Aug 2) piled up,
all logged-out, none exposing the API port. The `start-ibc.sh` wrapper refused to launch
because it detected an existing (dead-but-present) launcher.

**Fix (operator + bb8):**
1. Killed the stale IBC launcher + all duplicate `GWClient` JVMs by explicit PID (Xvfb `:99` left up).
2. Relaunched `/home/ubuntu/ibgateway-native/start-ibc.sh` — clean auto-login as `glancashire`.
3. Graham approved the IBKR Mobile 2FA push. `Login has completed` 10:22 UTC; `:4001` up.
4. `check-interactive-brokers-readiness.js` → `ibkr_ready`, live/realtime market data via SXR8 probe.

**Standing lesson (already in TOOLS.md):** check `ss -ltn | grep :4001` BEFORE starting;
if up, do nothing. Duplicate launches self-evict via `ExistingSessionDetectedAction=primary`.
The only manual step that cannot be automated on this headless host is the 2FA tap.

---

## 2. IBKR hosted MCP read layer — SHIPPED (live, verified)

IBKR now runs an official hosted **MCP server** (`https://api.ibkr.com/v1/api/mcp-public`,
announced at interactivebrokers.com/en/trading/ai-integrations.php). It connects an
MCP-capable AI to the account via OAuth — no API keys/passwords shared. Trades are
**draft-only** on that rail (instructions never auto-submit; you convert them in an IBKR
platform's "AI Instructions" tab).

### What was wired
- Installed `mcporter` 0.9.0 (`/usr/bin/mcporter`).
- Registered IBKR in OpenClaw's **native MCP registry** (`openclaw.json` → `mcp.servers.ibkr`),
  NOT the `mcporter` plugin — native tools surface directly to the agent in standard profiles,
  and OpenClaw's OAuth flow is operator-friendly (`openclaw mcp login ibkr` → URL → `--code`).
- `transport: streamable-http`, `auth: oauth`, timeouts connect=8s/request=30s.
- **Read-only tool filter** (defence-in-depth over IBKR's own read scope):
  - include: `get_*, list_*, search_*, read_*, scanner*, market*, quote*, historical*, positions*, portfolio*, account*`
  - exclude: `*order*, *place*, *cancel*, *modify*, *transmit*, *trade*, *submit*`
- OAuth authorized (`tokens=yes`). Removed the redundant `mcporter` config entry so
  `openclaw.json` is the single source of truth.

### Verification
- `openclaw mcp probe ibkr --json` → 20 read tools, `diagnostics: []`.
- Live read proof via `ibkr__get_account_summary` / `get_account_balances` / `get_account_positions`.
- No order/transmit tool passed the filter.

### Design decision
- The MCP layer is a **read + research** rail only. Live order **transmission stays on the
  native `:4001` gateway path** with the safe-word + PIN approval gate. MCP is draft-only anyway.
- Data rail comparison (native vs MCP) is in the session log; short version: MCP is
  cloud-hosted/OAuth/no-gateway-babysitting for reads; native remains authoritative for execution.

### Operator commands
```bash
openclaw mcp status --verbose        # shows ibkr: authorized, tool-filtered
openclaw mcp probe ibkr --json       # live tool list + reachability
openclaw mcp login ibkr              # re-auth (URL → openclaw mcp login ibkr --code <code>)
openclaw mcp logout ibkr             # clear tokens, keep definition
```

---

## 3. Dashboard-vs-broker FX drift — ROOT-CAUSED, fix DESIGNED (NOT built)

**Symptom:** dashboard total (CHF 152,082 at 10:51Z) vs IBKR live net-liq (CHF 155,895)
— a ~CHF 3,900 gap. CHF-native positions (CHSPI, SPMCHA, NUCL) reconciled to the cent;
only foreign-currency positions drifted → classic FX-conversion error, not a data error.

**Root cause (verified live):**
- `holdingsSync.js` seeds per-currency FX from `extractFxRatesToChf(ledger)`, which only
  reads ledger rows tagged `ExchangeRate`.
- The native client's `fetchLedger` → `waitForAccountSummary(api, 'All')` requests a fixed
  tag list: `AccountType,NetLiquidation,TotalCashValue,SettledCash,BuyingPower,AvailableFunds,CashBalance`.
  **`ExchangeRate` is not requested**, so `extractFxRatesToChf` always returns `{CHF:1}`.
- FX therefore falls back to **stale `portfolio.md` `fx_to_chf` hints**. The scale-to-NetLiq
  step hides the absolute error but smears drift across currencies by stale *relative* ratios.
- The 10:51 sync additionally ran while auth was still failing, so it preserved a stale snapshot.

**Live FX available right now (from IBKR, via MCP `get_account_balances` `exchange_rate`):**
EUR→CHF 0.934651 · USD→CHF 0.809462 · GBP→CHF 1.090180.

**Designed fix (queued — see PLAN.md Phase N):**
1. Add a live-FX source in the native client: request the special `$LEDGER:ALL` account group
   (exposes per-currency `ExchangeRate`), OR add a `fetchBalances()` that reads the same
   per-currency `exchange_rate` the CP `/portfolio/{acct}/ledger` and MCP `get_account_balances`
   already return.
2. Make that live rate the **preferred seed** in `holdingsSync.js` (live → `portfolio.md` hint → 1).
3. Keep the scale-to-NetLiq correction as a secondary consistency check; log when live-seed and
   scaled-seed diverge > tolerance.
4. Regression test: given known live rates + positions, computed CHF total must match NetLiq
   within tolerance without relying on stale hints.

**Why not landed today:** it touches the financial reporting path; it needs a test and a
green safe-lane before commit. Diagnosis is complete and the integration points are known.

---

## 4. Minor bug — `sync-ibkr-accounting-snapshot.js` arg parsing (NOT fixed)

`scripts/sync-ibkr-accounting-snapshot.js` uses `process.argv[2]` directly, so
`--portfolio=etf` becomes the literal portfolio name and it writes to a `runtime/ibkr-accounting/--portfolio=etf/`
directory. Sibling scripts already handle `--portfolio=` (`sync-ibkr-after-recovery.js`) or a
bare dir (`sync-interactive-brokers-holdings.js`). Small, self-contained; queued with Phase N.

---

## 5. Doc consolidation performed 2026-08-07

- Created this audit.
- `STATUS.md` / `PLAN.md`: added MCP read layer (shipped) + Phase N (FX live-rate + arg fix, queued).
- `MEMORY.md`: durable note on the IBKR MCP read layer + read tools.
- `docs/operations/repo-map.md`: fixed stale `CURRENT_PLAN.md` references → `PLAN.md`.
- Archived fully-shipped / resolved plans:
  - `plans/quote-service-remaining.md` → `archive/phase-plans/` (all phases shipped).
  - `tmp/bugfix-plan.md` → `archive/phase-plans/` (bug1 `reqAllOpenOrders` landed; holiday-calendar shipped as Phase 166).
  - `docs/plans/cleanup-sentry-env-and-gateway-stability.md` → `archive/phase-plans/` (Sentry `.env` + gateway stability addressed).
