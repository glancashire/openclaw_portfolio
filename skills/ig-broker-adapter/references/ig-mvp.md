# IG MVP Reference

## Scope

The IG adapter is the first broker integration for the portfolio-manager MVP.

Required MVP capabilities:
- authenticate using secure credential storage
- list available IG accounts
- select the correct investment account
- read cash balance
- read current holdings/positions
- search ETF instruments
- fetch ETF prices
- prepare ETF buy/sell orders
- submit orders only if execution mode permits it
- track order status
- log broker interactions safely

## Constraints

- Build and validate in read-only + dry-run mode first.
- Live trading stays disabled until:
  1. account matching works
  2. holdings sync is reliable
  3. trade proposal generation is correct
  4. order quote generation is correct
  5. user explicitly enables live execution

## Normalization requirements

Normalize IG-specific payloads into stable portfolio-facing shapes for:
- account summary
- cash balances
- holding rows
- instrument details
- price data
- order quote results
- order status

## Logging requirements

Every broker interaction should log:
- timestamp
- method/operation
- status
- safe summary
- portfolio context when relevant

Do not log:
- passwords
- API keys
- session tokens
- raw auth headers

## Design note

The portfolio layer should be able to swap IG for Swissquote later with minimal changes. Keep IG quirks isolated in adapter code and adapter docs.
