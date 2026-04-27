# IG Adapter

## Purpose
Implement the IG / ig.com broker adapter for the portfolio-manager MVP.

## Required interface
- authenticate()
- list_accounts()
- select_account(account_reference)
- get_cash_balances()
- get_holdings()
- get_instrument_details(identifier)
- search_instruments(query)
- get_latest_price(identifier)
- get_order_quote(order)
- place_order(order, dry_run=true)
- get_order_status(order_id)
- cancel_order(order_id)
- normalise_broker_holding(raw_holding)
- normalise_broker_order(raw_order)

## MVP constraints
- Start in read-only + dry-run mode.
- Keep live execution disabled until validation gates pass.
- Keep IG-specific quirks isolated from portfolio logic.
