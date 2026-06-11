# IBKR API scoping runbook (Phase L1.E)

**Status:** 🛑 **CLOSED — won't fix** as of 2026-06-11 08:30 UTC

**Why closed:** IBKR retail accounts do not allow market-data subscription sharing between live users on the same account. Confirmed by IBKR Campus docs and the r/interactivebrokers community: "each user needs its own market data subscriptions". The `glancashire-bb8` sub-user activated successfully (2026-06-10) and could log into IB Gateway, but the readiness probe surfaced the expected symptom: "Requested market data is not subscribed. Displaying delayed market data." Granting `glancashire-bb8` real-time SIX/Xetra/LSE L1 would mean paying every subscription a second time (~CHF 30-50/month), which is not worth the blast-radius reduction we'd buy.

**Decision:** stay single-gateway. Rely on the safe-word + PIN approval gate (memory/feedback_approval_safeword.md) plus the rule that `scripts/approve-and-execute.js` is the only script that transmits orders. That's the high-value control. The split-key was belt-and-braces.

**What was unwound (2026-06-11):**
- `/home/ubuntu/ibgateway-readonly/`, `/home/ubuntu/Jts-readonly/`, `/home/ubuntu/ibc-readonly/` archived to `.archive/2026-06-11-l1e-park/` in the workspace.
- IB Gateway login switched back from `glancashire-bb8` to `glancashire`.
- The `glancashire-bb8` IBKR user is left in place (activated, no subscriptions) in case future requirements warrant revisiting.

**If you ever revisit this:** the only retail-friendly path is single-gateway with login swap (Option A in the original runbook). The two-gateway concurrent split (Option B) requires either an advisor/F&F account type or paying for duplicate subscriptions.

---

## Original runbook (preserved for reference)

**Audience:** Graham
**Time required:** ~15 minutes (once activation is complete)
**Risk reduction:** turns the IBKR Trading API from "single key with full power" into "two keys, only one can place orders" — meaningfully shrinks the blast radius if `.env` ever leaks.

---

## Activation gotcha

When you create an IBKR sub-user, IBKR sends a temporary password to the sub-user's email. **The sub-user is not usable for API/Gateway login until you complete first-login activation:**

1. Log into <https://www.interactivebrokers.com/sso/Login> as the sub-user (`glancashire-bb8`) with the **temporary password** from the email.
2. IBKR forces a password change.
3. IBKR forces 2FA enrolment (IBKR Mobile or TOTP).
4. Accept market-data agreements (the new user inherits the same subscriptions as the main user).
5. After all of this, the user shows as **Active** in *Users & Access Rights* and can log into IB Gateway.

**What I observed on 2026-06-05:** two login attempts (`glancashire-bb8` and `glancashirebb8`) with the main user's password were both rejected at the username/password stage with no 2FA prompt — which is consistent with either a pending-activation user or a different password. I stopped at 2 attempts to avoid IBKR account lockout.

Graham confirmed (11:31 UTC) the username is `glancashire-bb8` (literal hyphen) and asked to park this until activation is complete.

---

## What you're going to do

Your current setup uses **one** IBKR account login with **full Trading API permissions**. That means anything that can read `.env` (or shell out as the `ubuntu` user on this host) can place real orders.

After this runbook:

1. The **read-only** code paths (holdings sync, dashboard, health monitor, market-calendar sync) will use a **separate IBKR user** with `View only` permission — it physically cannot place orders even if compromised.
2. The **trading** code paths (basket execution) will keep the existing user, with `Trade` permission, only used by `scripts/approve-and-execute.js` after the safe-word gate.

---

## Why this matters

Today, every cron job that touches IBKR uses the same client/login. Your daily sync, dashboard, health monitor, and basket execution all share one IBKR API connection. If a bug or an attacker ever bypasses the approval gate (or you ever need to debug a cron job in elevated mode), the API has full trading power.

Splitting the keys creates a hard physical boundary at IBKR's side — even if everything else fails, the read-only key cannot place an order. IBKR rejects it.

---

## Step-by-step

### Part 1: Create the read-only sub-user at IBKR

1. Log into **IBKR Client Portal** at <https://www.interactivebrokers.com/sso/Login>.
2. Top right → **User Settings** → **Users & Access Rights** → **Add User**.
   - If your account doesn't show that option, you need to be on Friends & Family / Advisor account type. For a single-user retail account, IBKR has a different path: **Settings → Account Settings → Users → Add User**.
3. Create a new user:
   - **Name:** `bb8-readonly` (or any descriptive name — this is just a label)
   - **Email:** any email you can receive at (used for the welcome message)
   - **Permissions:**
     - ✅ **Account Information / Read** (statements, balances, positions)
     - ✅ **Reports / Read**
     - ❌ **Trading** — UNCHECK
     - ❌ **Funds / Transfers** — UNCHECK
     - ❌ **Account Configuration** — UNCHECK
4. **Two-factor:** enable IBKR Mobile authenticator OR a TOTP app. Save the recovery codes in your password manager.
5. Submit. IBKR will email a temporary password to the address you supplied.
6. Log into the new user once via the regular login page to:
   - change the temporary password,
   - confirm 2FA setup,
   - accept the standard market-data agreements (you'll need the same data subscriptions as the trading user — they cost the same; if your account already has them, the new user inherits them at no extra cost).

### Part 2: Negative test — confirm read-only cannot trade

Before wiring it up, prove the new user is actually read-only.

1. Log into the new `bb8-readonly` user via the standard web client portal.
2. Try to navigate to **Trade** or **Order Entry**.
3. You should see "You do not have trading permission" or the menu item should be absent.
4. If you can see Order Entry: stop, go back to Part 1, and uncheck Trading.

### Part 3: Get a separate API connection for the read-only user

IBKR's API uses the IB Gateway. Each IB Gateway instance logs in as **one** user. You have two options:

#### Option A (simpler) — same gateway, switch the login

If you're OK with read paths and trading paths being **temporally separate** (the gateway is logged in as one user at a time):

- For routine reads, log the gateway in as `bb8-readonly`.
- When you want to trade: log out, log back in as the trading user, run the basket, log back out.

This is closest to a manual broker workflow but doesn't fit your automated cron schedule.

#### Option B (recommended) — two gateway instances on different ports

- Keep the existing gateway on port `4001` for the **trading** user.
- Stand up a second gateway on port `4002` for the **read-only** user.
- Cron jobs that only read use port `4002`; only `scripts/approve-and-execute.js` uses port `4001`.

I'll assume you're going with **Option B**. The work on the runtime side is below.

### Part 4: Stand up the read-only gateway on port 4002

The existing gateway lives at `/home/ubuntu/ibgateway-native/`. Duplicate the directory for the read-only user:

```bash
cp -r /home/ubuntu/ibgateway-native /home/ubuntu/ibgateway-readonly
cd /home/ubuntu/ibgateway-readonly

# Edit Jts/jts.ini → change apiPort=4001 to 4002
sed -i 's/apiPort=4001/apiPort=4002/' /home/ubuntu/Jts-readonly/jts.ini  # adjust path if jts.ini is elsewhere

# Edit start-ibc.sh → change the login user, port, and any DISPLAY:
#   - LOGIN_USER=bb8-readonly
#   - LOGIN_PASSWORD_FILE=/home/ubuntu/.ibkr-readonly-password (chmod 600)
#   - API_PORT=4002
#   - XVFB_DISPLAY=:100   (so it doesn't collide with :99 used by the trading gateway)
```

You don't have to do all of this manually — once you confirm you want Option B, I can write a `scripts/ops/setup-readonly-gateway.sh` that handles it idempotently. Say so when you read this.

### Part 5: Wire the new keys into the workspace

`.env.example` will get a two-key pattern:

```
# --- Interactive Brokers (Phase L1.E split-key model) ---
# READ paths use this key. Trading API permission is DISABLED on this user at IBKR.
IBKR_READ_HOST=127.0.0.1
IBKR_READ_PORT=4002
IBKR_READ_CLIENT_ID=201
IBKR_READ_ACCOUNT_ID=...
IBKR_READ_USERNAME=bb8-readonly

# TRADING paths use this key. Only `scripts/approve-and-execute.js` should touch it.
IBKR_TRADE_HOST=127.0.0.1
IBKR_TRADE_PORT=4001
IBKR_TRADE_CLIENT_ID=101
IBKR_TRADE_ACCOUNT_ID=U25624150
IBKR_TRADE_USERNAME=glancashire

# Legacy single-key pointers (kept for backwards compat — point at the read key by default)
IBKR_HOST=127.0.0.1
IBKR_PORT=4002
IBKR_CLIENT_ID=201
IBKR_ACCOUNT_ID=U25624150
IBKR_USERNAME=bb8-readonly
```

The `InteractiveBrokersClient` class already accepts `host`, `port`, `clientId` overrides at construction time. The runtime change is:

- All cron-driven scripts (`sync-interactive-brokers-holdings.js`, `regenerate-dashboard.js`, `monitor-fills.js`, `run-health-check.js`, etc.) construct the client with the **read** env vars.
- Only `scripts/approve-and-execute.js` and the basket runner construct it with the **trade** env vars.

I'll do that wiring as a code change after you confirm the gateway is up on `4002` and you've confirmed the negative test from Part 2.

### Part 6: Smoke tests after wiring

1. `node scripts/check-interactive-brokers-readiness.js` — should connect to `:4002`, return `READY` for read paths.
2. `node scripts/sync-interactive-brokers-holdings.js portfolio/etf U25624150` — should still work.
3. From the read-only key, attempt a fake order via the IBKR Python client just to confirm the broker rejects it. (This is a manual test; I can write a script if you want.)
4. `node scripts/approve-and-execute.js --approval-id=<id> --secret=<safeword> --portfolio=etf` — should still connect to `:4001` and place orders.

---

## Rollback if anything goes wrong

The split is fully reversible. `.env` keeps the legacy single-key pointers (`IBKR_HOST`/`IBKR_PORT`/etc.) so you can:

```bash
# Edit .env: set IBKR_HOST and IBKR_PORT back to the trading gateway
sed -i 's/IBKR_PORT=4002/IBKR_PORT=4001/' .env

# Stop the read-only gateway
pkill -f ibgateway-readonly
```

Until I do the code wiring (Part 5), the workspace still uses `IBKR_HOST`/`IBKR_PORT` directly, so changing those values is enough to revert.

---

## What I'll do once you've done Parts 1–4

1. Update `.env.example` with the two-key pattern.
2. Touch `src/brokers/interactive-brokers/client.js` to accept a `kind=read|trade` constructor option that selects the right env block.
3. Update every read-side caller to pass `kind:'read'`.
4. Add `scripts/test-ibkr-key-separation.js` that asserts:
   - read-side scripts construct clients on the read port,
   - trade-side scripts construct clients on the trade port,
   - the read key has no `Trading` permission listed in the broker readiness response.
5. Add a `READ vs TRADE` row to `runtime/overview/portfolio-index.json` so the dashboard surfaces which key was used for the latest sync.

---

## Decision check before you start

| # | Decision | Recommendation |
|---|---|---|
| 1 | Option A (one gateway, swap login) or Option B (two gateways)? | **B** — only Option B is compatible with cron-driven daily reads while you're not at the keyboard |
| 2 | Do this now, after Phase H2 (rebalance review on 2026-06-17), or after L2 capital threshold? | **Now** — single biggest blast-radius reduction available |
| 3 | Do you want me to write the gateway setup script, or do it by hand? | **Setup script** — one-time idempotent, safer than manual sed |

---

## When you're done

Reply with: **L1.E gateway is up** and I'll do Parts 5 and 6 in one batch.

If something blocks you (IBKR doesn't show the user-management UI on your account type, market-data subscription costs change for the new user, etc.), share the error/screenshot and I'll adjust.

---

## What's already staged on the host (2026-06-05)

For when activation completes, these scaffolding files are in place. The trading gateway on `:4001` is untouched.

| Path | Purpose |
|---|---|
| `/home/ubuntu/ibgateway-readonly/start-ibc.sh` | Launcher (display `:100`, IBC command port `7463`) |
| `/home/ubuntu/Jts-readonly/jts.ini` | API port `4002`, `ReadOnlyApi=true` |
| `/home/ubuntu/ibc-readonly/config.ini` | `IbLoginId=glancashire-bb8`, `ReadOnlyLogin=yes`, `ReadOnlyApi=yes` |

**To resume:**

1. Confirm `glancashire-bb8` shows as **Active** in IBKR *Users & Access Rights*.
2. If the password differs from the main user, set it in `.env` line `IBKR_PASSWORD_BB8=<password>` and update `/home/ubuntu/ibc-readonly/config.ini` `IbPassword=` from that value (chmod 600).
3. Run `/home/ubuntu/ibgateway-readonly/start-ibc.sh`.
4. Watch for port `4002` to start listening: `ss -ltnp | grep 4002`.
5. Once it's up, reply with **L1.E gateway is up** and I'll wire Parts 5 + 6.

