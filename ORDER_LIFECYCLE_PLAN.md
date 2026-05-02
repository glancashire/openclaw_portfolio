# IBKR Order Lifecycle Completion Plan

## Goal
Expose a repo-level Interactive Brokers order lifecycle surface that stays safe for the MVP:
- read-only by default
- confirmation-gated for any non-dry-run action
- normalized outputs for quote / place / status / cancel
- safe broker event logging

## Current state
- `src/brokers/interactive-brokers/client.js` already supports auth, accounts, ledger, positions, contract search, and market snapshots.
- The repo client still returns `not_implemented` for:
  - `getOrderQuote`
  - `placeOrder`
  - `getOrderStatus`
  - `cancelOrder`
- The skill-side implementation already has practical primitives via `skills/ibkr/scripts/ibkr_cli.py` for:
  - `quote`
  - `place-order`
  - `open-orders`
  - `cancel-order`
- Read-only protection already exists in the repo client and must remain intact.

## MVP-safe implementation order
1. Add order normalization helpers that can represent:
   - quote preview
   - dry-run order intent
   - open order status
   - cancel result
2. Implement `getOrderQuote(order)`:
   - support quote/preview using current market data for the specified instrument
   - never require writability for dry-run-style quote preview
   - return normalized estimated value, currency, price reference, and warnings
3. Implement `placeOrder(order, { dryRun = true })`:
   - for `dryRun=true`, return a normalized simulated submission payload only; do not hit broker write APIs
   - for `dryRun=false`, preserve `readonly` block and then use the skill/native path when explicitly enabled later
4. Implement `getOrderStatus(orderId)`:
   - read open orders from the skill path first
   - normalize status and quantities
5. Implement `cancelOrder(orderId)`:
   - preserve readonly block
   - use skill path only when writable mode is explicitly allowed later
6. Add thin scripts/tests for the normalized order surface

## MVP completion definition for this phase
- The repo can produce a normalized order quote/preview from approved ETF instruments.
- The repo can produce a normalized dry-run order submission object without writing.
- The repo can inspect current open-order status across native and skill-backed broker modes.
- Live submission and cancel remain blocked while readonly is true.

## Progress update
- Implemented normalized order quote + dry-run preview in the repo client.
- Implemented open-order status lookup on both native and skill-backed paths.
- Implemented cancel-path normalization on the skill path, while repo-level readonly protection still blocks cancellation before any broker write.
- Verified that missing order lookups return `not_found` cleanly and readonly cancellation attempts fail closed.

## Non-goals for this pass
- Turning on live trading
- Auto-submitting orders
- Removing confirmation gates
- Changing the ETF-only / CHF-first scope
