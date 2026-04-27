# Interactive Brokers Adapter

## Purpose
Implement the Interactive Brokers Web API adapter for the portfolio-manager system.

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
- Keep Interactive Brokers specific quirks isolated from portfolio logic.
- Use the Web API path documented at IBKR Campus.
