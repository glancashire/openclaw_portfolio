---
name: ig-broker-adapter
description: Design, implement, or review the IG / ig.com broker adapter for the OpenClaw portfolio-manager MVP. Use when defining authentication flow, account selection, holdings sync, instrument lookup, price lookup, order quoting, dry-run order submission, safe logging, or read-only validation against the portfolio-manager specification.
---

# IG Broker Adapter

Use this skill for all IG-specific integration work.

## Safety rules

- Start in read-only plus dry-run mode.
- Do not add live trading shortcuts before holdings sync and order quote flows are validated.
- Never log raw credentials, session tokens, or personally identifying account secrets.
- Normalize broker data before it reaches portfolio logic.
- Failed broker calls must not trigger repeated autonomous retries that could submit duplicate orders.

## Required interface

Implement or preserve these functions:

```text
authenticate()
list_accounts()
select_account(account_reference)
get_cash_balances()
get_holdings()
get_instrument_details(identifier)
search_instruments(query)
get_latest_price(identifier)
get_order_quote(order)
place_order(order, dry_run=true)
get_order_status(order_id)
cancel_order(order_id)
normalise_broker_holding(raw_holding)
normalise_broker_order(raw_order)
```

## Workflow

1. Read `references/ig-mvp.md` before changing IG adapter design.
2. Separate credential handling from portfolio state files.
3. Implement account discovery and matching first.
4. Implement holdings and cash sync next.
5. Implement price lookup and instrument search.
6. Implement order quote generation.
7. Keep `place_order` dry-run by default until explicitly enabled by configuration and user approval.
8. Document safe summaries and failure modes.

## Output expectations

- Prefer explicit adapter contracts and normalized field maps.
- Document assumptions about IG account types or investment-account differences.
- Mark unresolved API ambiguities instead of guessing.
