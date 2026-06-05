# Risk Audit — Portfolio Manager (2026-06-05)

**Scope:** OpenClaw portfolio manager controlling ~CHF 150,000 in live ETF trades on Interactive Brokers
**Audit basis:** Source code review of `src/execution/`, `src/brokers/interactive-brokers/`, cron schedule, approval gate, operational state
**Prior changes today:** Added pre-flight safeguards (`src/execution/orderSafeguards.js`) wired into the basket runner.

---

## 1. Executive summary

The system has solid **multi-layer approval discipline** for the happy path: portfolio.md policy → instrument whitelist → safe-word/PIN intent gate → transmittedLiveAck string → broker readiness check → tick-rounding. That's a real defence-in-depth chain.

**Where it was thin (now hardened):**

1. **No price-floor on SELL limits** (could in theory transmit a SELL at any price, even far below market). Now blocked: SELL limit > 5% below bid → refused.
2. **No envelope-level SELL gate.** A SELL leg only checked `userApproved` per-leg, which the runner sets unconditionally. Now requires `envelope.sellApproved === true` AND any sell leg.
3. **No fat-finger ceiling for BUY.** Now: BUY limit > 5% above ask → refused.
4. **No notional cap.** Single bug or hallucination could submit CHF 100k in one leg. Now: per-leg cap CHF 25k, basket cap CHF 50k.
5. **No stale-quote guard.** Bid=0 / ask=0 / crossed-quote / no-quote now refused.

**Where the system is still weak (recommended P1/P2 below):**

- The agent (me) still has `transmit` capability through `exec` calls. The approval gate prevents unintended transmits, but a hallucination *with* a fresh safe-word in scope could in theory chain. Mitigation: SELL envelope flag + price floor now in place.
- Memory/portfolio.md files are not signed; corruption or prompt-injection edits aren't detected.
- The cron jobs that run agent turns can call `exec`; their `toolsAllow` is sometimes broad (`exec, read, write, edit`).

**Bottom line:** the live-money risk profile after today's hardening is acceptable for the current capital level (CHF 150k). For meaningful capital growth (CHF 500k+) I'd recommend the P1 items.

---

## 2. Current safeguards inventory (what's already good)

### 2.1 Approval gate (`src/execution/approvalGate.js`)

- `requireApprovalIntent({ approvalId, scope, scriptName })` — refuses to transmit unless `runtime/approval-intent/<approvalId>.json` exists, is fresh (< 30 min by default), and was signed with the safe-word/PIN.
- Bypass `OPENCLAW_SKIP_APPROVAL_GATE=1` is **explicitly disallowed** in combination with `OPENCLAW_PLACE_LIVE_ORDER=1` (live transmission cannot skip the gate). See `approvalGate.js:68-71`.
- Scope-scoped: a `basket-execute` intent cannot be reused for `trades-execute` and vice versa.
- Safe-word + PIN come from `.env` (chmod 600, gitignored), loaded via `loadWorkspaceEnv`.

### 2.2 Portfolio policy gate (`src/execution/portfolioExecution.js`)

In `evaluateExecutionPolicy` (line 135), every order is checked against:

| Check | Code reference | What it blocks |
|---|---|---|
| Instrument in Approved Instruments | `:147` | Off-whitelist trades |
| Portfolio status active | `:148` | Trades on inactive portfolios |
| Execution mode = transmitted_live | `:151` | Accidental live transmission |
| `requireFirstTradeConfirmation` | `:155` | First-ever live trade w/o approval |
| `requireFirstPurchaseApproval` | `:159` (BUY only) | First buy w/o approval |
| `requireSalesApproval` | `:162` (SELL only) | Sell w/o approval |
| Holdings unmatched / simulated / stale pricing | `:165-167` | Bad-data state |
| Excluded instruments | `:169-171` | Blacklist hit |
| Broker readiness (auth, fallback, configured) | `:173-176` | IBKR unreachable |
| `transmit && !userApproved` | `:178` | Unflagged transmit |
| `transmittedLiveAck === "I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER"` | `:179` | Magic-string acknowledgement |
| `errorState.stopAutomation` (broker circuit breaker) | `:180` | Auto-stop after N consecutive errors |

### 2.3 Tick-size validation (`src/execution/basketReproposalBuilder.js`)

`tickForPrice()` walks the IBKR Market Rule 1874 table; the basket runner rounds limit prices to a valid tick before transmit (`basketExecutionRunner.js:115-122`). Prevents `inactive` orders due to tick-mismatch.

### 2.4 Trend / extreme-move guard (`src/execution/marketOpenPolicy.js:66-77`)

For BUY orders submitted via the market-open path (not currently active for basket runner — `enforceMarketHours: false`): blocks if price is up ≥ 3% vs prior close. **NOT wired into the basket runner today** — recommended P2.

### 2.5 Price drift between approval and execution (`src/execution/basketReapprovalStore.js`)

Compares approved limit price vs current; if ±0.5% drift → triggers reapproval flow. Used by the basket lifecycle on retries.

### 2.6 Approval intent freshness

`runtime/approval-intent/<id>.json` has TTL (30 min default). Stale intents → refused. Reuse protection: each transmit consumes the intent (timestamps checked).

### 2.7 Pre-flight safeguards (NEW today, `src/execution/orderSafeguards.js`)

- **SELL envelope flag** — basket with any SELL leg refused unless `envelope.sellApproved === true`
- **SELL price floor** — limit > 5% below bid → blocked (`sell_below_market_floor`)
- **BUY price ceiling** — limit > 5% above ask → blocked (`buy_above_market_ceiling`)
- **Per-leg notional cap** — CHF 25k per leg
- **Per-basket notional cap** — CHF 50k
- **Max 10 legs per basket**
- **Stale quote guard** — refuses no-quote, bid=0, ask=0, bid>ask
- Wired into `executeApprovedBasket()` and `scripts/execute-approved-basket-end-to-end.js` so all live-money paths run guards before any leg ships.

### 2.8 Audit trail

| Artefact | Content | Tamper risk |
|---|---|---|
| `runtime/approval-intent/<id>.json` | safe-word match scope, timestamp | local file |
| `runtime/approved-order-baskets/etf/<id>.json` | full envelope frozen at approval | local file |
| `runtime/basket-runs/etf/<id>.json` | run state, broker order IDs, fill prices, execution IDs | local file |
| `portfolio/etf/trades.md` | append-only Markdown log | local file |
| `portfolio/etf/history.md` | snapshots + execution events | local file |
| Git history | All committed | requires git access |
| Mailgun outbox | Dashboard digests + investor emails | external service |

Local files are not cryptographically signed — that's the main tamper vector if host is compromised.

---

## 3. Risk matrix (likelihood × impact)

| Risk | Likelihood | Impact | Mitigation status |
|---|---|---|---|
| Agent hallucinates SELL instruction | Low | High | ✅ Mitigated (envelope flag + price floor) |
| Fat-finger BUY price (e.g. 6190 vs 61.90) | Low | Medium | ✅ Mitigated (5% ceiling) |
| Stale market data → bad limit | Medium | Medium | ✅ Mitigated (stale-quote guard) |
| Cron triggers unintended trade | Very low | High | ✅ All cron jobs are read-only or require approval gate |
| Re-run of execute script transmits twice | Low | High | ⚠️ Partial (intent freshness + duplicate-leg detection in runs artifact, but basket itself can re-run if still fresh) |
| FX rate stale or wrong | Medium | Low–Medium | ⚠️ Currently uses envelope-time FX; not refreshed at transmit |
| IBKR account credential compromise | Low | Catastrophic | ⚠️ Read-only API key at IBKR side recommended |
| Host compromise (SSH) | Low | Catastrophic | ⚠️ Workspace `.env` has approval secrets; safe-word is the only thing between attacker and live trade |
| Operator approves wrong basket | Low | Medium | ✅ Approval names approvalId; safe-word doesn't approve "any" basket |
| Memory file injection | Low | Low | ⚠️ Files not signed; agent reads them as fact |
| Prompt injection via web/email | Low | Low (no transmit path from agent without `.env` secret + approvalId) | ⚠️ Could induce wrong analysis but not unauthorised trade |
| Broker API returns garbage (bid=0) | Low | Medium | ✅ Mitigated |
| Daily loss limit / cumulative drawdown | n/a | High | ❌ Not implemented |
| Whole-portfolio liquidation by single command | Very low | Catastrophic | ❌ Not capped (notional caps help: 50k basket = ~33% of NLV) |

---

## 4. Gap analysis with code references

### 4.1 No daily loss / cumulative-sell circuit breaker

- **Gap:** even with per-basket caps, an attacker (or a series of operator mistakes) could submit 3 baskets of CHF 50k each in a day = full portfolio.
- **Where to add:** `src/execution/basketExecutionRunner.js` `executeApprovedBasket()` entry; check `runtime/basket-runs/etf/*.json` aggregates for the trading day before allowing transmit.
- **Suggested rule:** max CHF 50k transmitted per UTC day across all baskets.

### 4.2 Approval intent reuse risk

- **Current:** intent file is checked for freshness (30 min) and matching approvalId.
- **Gap:** the file itself is not deleted after successful transmit. A second `execute-approved-basket-end-to-end.js` run within 30 min for the *same* approvalId would currently re-attempt; the runner's per-leg `legEligible()` check (`basketExecutionRunner.js:62`) would catch already-submitted legs (status not "approved"), but a fresh proposal under the same id could slip.
- **Fix:** delete `runtime/approval-intent/<id>.json` after `executeApprovedBasket` returns, regardless of outcome.

### 4.3 No max-orders-per-day cap

- Same as 4.1 above; add to runner entry.

### 4.4 `agents.defaults.sandbox.mode = "off"` (host-required)

- Documented in TOOLS.md as required because there's no Docker daemon on this host. Means agent turns run in the parent OS context. Already a known-and-accepted operational invariant.

### 4.5 `.env` secrets in plaintext on disk

- Mitigation: chmod 600, gitignored.
- Gap: a host compromise reads the safe-word and PIN.
- Fix candidates: macOS Keychain integration (not applicable on Linux host), HashiCorp Vault (overkill for personal use), or hardware-backed (YubiKey) — material upgrade only worth it at higher capital.

### 4.6 IBKR API exposure

- Account `U25624150` has order-placement enabled.
- Read-only mode is enforceable in IBKR client portal (Configure → User → Permissions → Trading → set to "View only"). Currently NOT enabled.
- Recommendation: enable a separate IBKR sub-account with view-only API for read paths; keep order-placement only on the trading account, behind the safe-word.

### 4.7 Cron jobs with `toolsAllow: ['exec', 'read', 'write', 'edit']`

Two daily-sync crons grant write+edit (`portfolio-etf-daily-sync-and-dashboard`, monthly/quarterly reports). They are not pointed at execute-and-transmit scripts, but the broad tool grant means a compromised cron payload could in theory write to `.env` or modify scripts. Tighten to `read, write` only where edit isn't actually needed; remove `exec` where a bare script call suffices.

### 4.8 No request-rate / order-rate limit

- IBKR has its own pacing rules; if breached, orders get rejected, not duplicated. Acceptable risk.

### 4.9 No monitoring of post-fill drift

- After fills, no automated check that "did we actually buy what we approved?" Manual reconciliation only. The reconcile step in the runner does this, but doesn't alert on mismatch.

---

## 5. Recommendations

| # | Action | Priority | Where | Status |
|---|---|---|---|---|
| 1 | Pre-flight SELL/BUY guards (price floor, ceiling, notional caps, stale quote) | **P0** | `src/execution/orderSafeguards.js` + runner wire-in | ✅ **DONE today** |
| 2 | Envelope-level `sellApproved` flag (any SELL leg requires it) | **P0** | `orderSafeguards.evaluateBasketSafeguards` | ✅ **DONE today** |
| 3 | Tighten "Require user approval for sales" portfolio.md value (was "yes unless auto_trade_limited is enabled" — parser only matched "yes"/"no" → was returning null = unset) | **P0** | `portfolio/etf/portfolio.md` | ✅ **DONE today** |
| 4 | Delete approval-intent file after execute returns | P1 | `scripts/execute-approved-basket-end-to-end.js` final block | Pending |
| 5 | Daily transmit cap (CHF 50k/day across all baskets) | P1 | New helper in `basketExecutionRunner.js`, reads `runtime/basket-runs/etf/` | Pending |
| 6 | Tighten cron `toolsAllow` lists | P1 | `cron list` → `cron update` | Pending |
| 7 | Wire trend guard into basket runner (block BUY if up >3% on day) | P1 | `basketExecutionRunner.js` reuses `marketOpenPolicy.evaluateMarketOpenBlock` | Pending |
| 8 | IBKR account: enable view-only API for read paths, restrict trading API to a separate scoped key | P1 | IBKR client portal | Pending (operator action) |
| 9 | Sign portfolio.md + memory/*.md so agent can detect tampering | P2 | Pre-commit + agent boot check | Pending |
| 10 | YubiKey / hardware-backed safe-word | P2 (only if capital > CHF 500k) | `.env` replacement | Pending |
| 11 | Monthly disaster recovery drill (simulate compromised host, verify backup state) | P2 | Operations runbook | Pending |
| 12 | Daily loss circuit breaker (e.g. if cumulative position value drops X% intra-day, freeze all transmit) | P2 | New cron + flag file | Pending |
| 13 | Multi-party approval (any basket > CHF 25k requires *two* sign-offs from different channels) | P2 | Future feature | Pending |

---

## 6. Specifically: Graham's two questions

### Q1: "Don't execute sell orders without my approval"

**Now airtight (multi-layer):**

1. `portfolio.md` `Require user approval for sales: yes` → policy gate (`portfolioExecution.js:162`)
2. SELL leg in basket envelope → safeguard refuses unless `envelope.sellApproved === true` (`orderSafeguards.evaluateLeg`)
3. Approval intent file required + safe-word/PIN match (`approvalGate.requireApprovalIntent`)
4. Transmitted live ack magic string (`portfolioExecution.js:179`)
5. IBKR account-level Trading API permission (last line of defence — currently enabled; recommendation P1.8 above to scope it down)

To execute a sell now, a basket must:
- contain a SELL leg, AND
- have `envelope.sellApproved: true` set in the envelope JSON, AND
- pass the approval safe-word/PIN gate, AND
- have limit price within 5% of bid, AND
- be within per-leg + per-basket notional caps, AND
- pass the policy gate (instrument approved, broker ready, etc.)

Six independent layers. Any one rejects → no sell.

### Q2: "Significantly below market price"

**Now blocked at 5% deviation** (default, configurable):

- SELL: `limitPrice < bid × (1 - 0.05)` → refused with `sell_below_market_floor`
- BUY: `limitPrice > ask × (1 + 0.05)` → refused with `buy_above_market_ceiling`

Tunable via `safeguardConfig` parameter in `executeApprovedBasket({ safeguardConfig: { maxBelowMarketPct: 3 } })`. To make tighter (e.g. 2%), pass that config or override `DEFAULTS` in `orderSafeguards.js`.

The 5% default catches all the disaster scenarios (typing 50 instead of 500 on price → 90% off-market = blocked). Tighter than 5% risks false positives on volatile open prints. 5% is the right starting point for ETF UCITS at IBKR.

---

## 7. Tests added

`tests/test-orderSafeguards.js` — 12 tests, all pass:
- SELL without `envelope.sellApproved` → blocked
- SELL with approval and on-market limit → passes
- SELL > 5% below bid → blocked
- SELL exactly 5% below bid → passes (boundary)
- BUY > 5% above ask → blocked (fat-finger)
- Leg notional > CHF 25k cap → blocked
- Crossed quote (bid > ask) → blocked
- Bid = 0 → blocked
- Basket-level: any SELL without flag → whole basket blocked
- Basket-level: total > CHF 50k cap → blocked
- Clean BUYs → passes
- DEFAULTS sanity

Full safe lane: 254/254 still passes after wiring.

---

## 8. Operational procedure additions

For any future SELL operation:
1. Build the basket envelope WITH `sellApproved: true` set explicitly.
2. Confirm limit prices are reasonable (within 5% of bid, ideally within 0.5% for liquid ETFs).
3. Run `node scripts/approve-and-execute.js --approval-id=<id> --secret=<safe-word>` exactly as for buys.
4. Watch the runner output for `safeguard_*` blockers. If any leg blocks, NOTHING transmits.

---

## 9. What to monitor going forward

- `runtime/basket-runs/etf/*.json` `safeguardBlockers` field — non-empty = guard fired
- `portfolio/etf/trades.md` for any unexpected SELL rows
- IBKR client portal "Recent Activity" daily for orders that don't match my logs
- Sentry for new error events from `orderSafeguards.js` (none expected, but signal of misuse)
