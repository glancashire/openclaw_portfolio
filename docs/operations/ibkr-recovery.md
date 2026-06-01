# IBKR recovery runbook

When the broker connection looks broken, follow this ladder in order.
Don't skip steps. Each one isolates a different layer of failure.

The whole thing should take well under 30 minutes including a manual 2FA.

## Tier 1 — Five-second status

```
node scripts/ibkr-fast-status.js
```

Reads exit code:
- `0` — fully healthy. If something downstream still looks broken, suspect dashboard/quote staleness, not IBKR.
- `1` — socket is dead. Go to step 2.
- `2` — socket up, auth not completed. Go to step 3.
- `3` — auth ok but read is broken. Go to step 4.
- `4` — read ok but quote posture degraded. Live submission stays blocked, but holdings/dashboards are truthful.

## Step 2 — Native gateway is down

Restart it:

```
/home/ubuntu/ibgateway-native/start-ibc.sh
```

Wait for the `:7462` port to start listening, then go to step 3.

If the wrapper script itself is gone or broken, the `TOOLS.md` "IBKR native gateway recovery" entry has the manual command line and the pinned install4j JRE path.

## Step 3 — Auth is pending (manual 2FA)

This is the one human-only step in the whole flow.

- IB Gateway runs its login UI on Xvfb display `:99`.
- Complete login + 2FA on that display.
- After 2FA, both `:4001` and `:7462` should be listening.
- Re-run `node scripts/ibkr-fast-status.js` to confirm.

If 2FA was completed but auth still fails, the gateway may have crashed mid-handshake. Check:

```
ss -ltnp | grep -E "4001|7462"
ps -ef | grep ibgateway
```

If only `:7462` is listening, login completed but the API socket didn't come up. Restart per step 2.

## Step 4 — Read path is broken (this is where today's incident lived)

Auth succeeds, but `fetchPositions` returns empty or the wrapper doesn't see what raw probes do.

Run the raw probe to confirm gateway has data:

```
node scripts/diagnostics/debug-native-api-surface.js
```

If raw probe sees positions but `fetchPositions` doesn't:
- The configured native `clientId` may be wrong for read-only discovery. The split is intentional — writes use the configured `clientId`, reads use `readonlyClientId + random`. Verify in `config/portfolio/etf/portfolio.json` (or env) that both ids are present and not equal.
- If two sync scripts are running concurrently, they will collide on the read session. The new sync guard catches this — second invocation returns `{ ok: false, reason: 'sync_in_progress' }`. Don't fight it; wait for the lock to clear.

After repair:

```
node scripts/sync-ibkr-after-recovery.js   # serial, with one retry-on-preserve
```

This wraps `sync-ibkr-accounting-snapshot.js` and `sync-interactive-brokers-holdings.js portfolio/etf` in the right order with the right argument shape (the bare `etf` argument is a known foot-gun).

## Step 5 — Quote posture is degraded but read is fine

Holdings and cash are truthful. Live submission must stay blocked. Dashboard regen is bounded so it does not stall. No action required unless the user explicitly wants to attempt live execution under delayed/unpriced posture, which requires a separate explicit decision.

## Step 6 — Quote posture remains `unknown` after auth and read are healthy

If `ibkr-fast-status` returns exit code 4 with `marketDataMode=unknown` and the readiness staged probe (Phase Cleanup-1C) reports `reason: 'posture_detection_timeout'` while positions and accounting come back fine, the issue is upstream of our code. The most likely causes, in priority order:

1. **Market-data subscription not active for the requested instruments / exchanges.**
   - Open the IBKR Client Portal: <https://www.interactivebrokers.com/sso/Login>
   - Account number: U25624150 (the one this workspace tracks).
   - Navigate to Settings → User Settings → Market Data Subscriptions.
   - Verify subscriptions for the venues in `portfolio/etf/portfolio.md` (LSE/SIX/NASDAQ/NYSE/Xetra in our case). Reactivate any lapsed packages.
   - After reactivation, IBKR may take a few minutes to propagate. Re-run `node scripts/ibkr-fast-status.js` to confirm.

2. **Data-farm not connected on the running gateway.**
   - In IB Gateway, the data-farm status row in the bottom of the UI should show `ushmds2a`, `eufarm.uk`, `eufarm.ge` etc. as `connected`.
   - If any are red, restart the gateway via the path in step 2.
   - As a cross-check from the host shell, this minimal probe should return at least one numeric field for SXR8 (conid 75776072):
     ```bash
     python3 - <<'PY'
     from ib_insync import IB, Stock
     ib = IB()
     ib.connect('127.0.0.1', 4001, clientId=171)
     contract = Stock(symbol='SXR8', exchange='LSEETF', currency='GBP')
     ib.qualifyContracts(contract)
     ticker = ib.reqMktData(contract, '', False, False)
     ib.sleep(2)
     print({'bid': ticker.bid, 'ask': ticker.ask, 'last': ticker.last, 'close': ticker.close})
     ib.disconnect()
     PY
     ```
   - All `nan` fields confirms a subscription / data-farm issue (not a code bug).

3. **Account is in a state where snapshots are silently rejected** (e.g. paper account that was migrated, demo / view-only mode).
   - Confirm in the Client Portal that the account status reads `Active` and the API permissions include market data.

### Why this is operator-gated

Nothing in this step can be fixed from the workspace shell. The credentials, subscription billing, and gateway login UI are all on the IBKR side. The agent will not attempt to log in or click buttons in the Client Portal.

While this is unresolved, the system stays in `degraded_dry_run_only` posture. Reads (positions, accounting, dashboards) remain truthful; the dashboard reports `Daily move CHF: unknown` per Phase Cleanup-1E so operators can distinguish a genuinely flat market from missing data.

## Why this list exists

On 2026-06-01 a recovery that should have taken 30 minutes took most of a day because the diagnosis ladder above wasn't written down. Specifically:

- Step 4 was conflated with step 1/2 for hours because the wrapper symptom (empty positions) looked identical to a real outage.
- Step 4's "concurrent sync interference" was not on the radar at all until repeated runs accidentally surfaced it.
- The `sync-interactive-brokers-holdings.js etf` vs `portfolio/etf` argument shape was rediscovered the hard way.

If you find a step missing, add it before forgetting again.
