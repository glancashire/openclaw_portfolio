# Trading Workflow

## Prerequisites

- IB Gateway running on port 4001 (authenticated via `/home/ubuntu/ibgw-login.sh`)
- `ib_insync` Python package installed
- Mailgun configured in `secrets/mailgun.json`
- ETF quality policy in `config/etf-quality-policy.json`

## ETF Quality Policy

All instruments must pass the quality filter before orders are placed:

- **Replication**: Physical only (no synthetic/swap-based ETFs)
- **TER**: Maximum 0.25% (prefer lowest available)
- **Override**: Explicit operator approval can bypass for specific instruments

Config: `config/etf-quality-policy.json`

## Market Hours Enforcement

Orders are only placed during market hours:

- **EBS (SIX Swiss Exchange)**: 09:00-17:30 CET, Mon-Fri
- **IBIS2 (Xetra)**: 09:00-17:30 CET, Mon-Fri
- **LSEETF (London)**: 09:00-17:30 GMT, Mon-Fri

Use `--force` to override (not recommended for production).

## Order Lifecycle

1. **Propose** — Analyze portfolio drift, generate trade proposal
2. **Validate** — Run ETF quality filter on all instruments
3. **Approve** — Operator reviews and approves trades
4. **Submit** — Place limit orders at market open with real-time pricing
5. **Monitor** — Cron job checks for fills every minute during market hours
6. **Notify** — Email sent on each fill with portfolio state update

## CLI Reference

```bash
node scripts/trade.js propose    # Generate trade proposal
node scripts/trade.js validate   # Check ETF quality
node scripts/trade.js submit     # Place orders (market hours only)
node scripts/trade.js status     # Show open orders
node scripts/trade.js cancel     # Cancel orders (--all or --order-id)
node scripts/trade.js history    # Recent executions
```

Options: `--dry-run`, `--json`, `--force`, `--help`

## Email Notifications

Fill notifications are sent to `lancashire@swift.ch` via Mailgun.
HTML emails include: trade details, portfolio allocation, open orders.

## Cron Jobs

- **submit-orders-at-market-open**: One-shot at 07:01 UTC on trading days
- **monitor-trade-fills**: Every minute Mon-Fri 07:00-17:59 UTC (disabled until orders placed)

## Troubleshooting

- **Market closed error**: Wait for market open or use `--force`
- **Quality filter failure**: Check instrument replication method and TER
- **IB Gateway disconnected**: Run `/home/ubuntu/ibgw-login.sh` (requires 2FA)
- **No fills detected**: Check order status with `trade status`
