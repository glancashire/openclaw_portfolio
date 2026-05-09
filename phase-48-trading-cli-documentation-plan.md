# Phase 48 — Unified Trading CLI + Documentation

## Goal
Create a single unified entry point for all trading operations and document the complete live trading workflow for operators.

## Checklist

### 1. Unified trading CLI (`scripts/trade.js`)
- [ ] Single entry point with subcommands:
  - `trade propose` — generate trade proposal based on portfolio drift
  - `trade validate` — run ETF quality filter on proposed trades
  - `trade submit` — place orders (respects market hours, quality filter)
  - `trade status` — show open orders and fill state
  - `trade cancel [orderId|all]` — cancel open orders
  - `trade history` — show recent executions
- [ ] Help text with usage examples
- [ ] Consistent JSON output with `--json` flag
- [ ] Dry-run support on all write operations

### 2. Trading workflow documentation
- [ ] Create `docs/trading-workflow.md` covering:
  - Prerequisites (IB Gateway, authentication)
  - ETF quality policy
  - Market hours enforcement
  - Order lifecycle (propose → validate → approve → submit → monitor → notify)
  - Email notifications
  - Cron job setup
  - Troubleshooting

### 3. Configuration documentation
- [ ] Document `config/etf-quality-policy.json` fields
- [ ] Document cron job IDs and schedules
- [ ] Document environment requirements (ib_insync, Mailgun key)

### 4. Tests
- [ ] Test `trade validate` subcommand
- [ ] Test `trade status` subcommand
- [ ] Test help output
- [ ] Test market-closed rejection on `trade submit`

## Exit criteria
- `node scripts/trade.js --help` shows all subcommands
- All subcommands work (dry-run where applicable)
- Documentation is complete and accurate
- Tests pass
