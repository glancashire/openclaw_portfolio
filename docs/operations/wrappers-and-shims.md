---
summary: "Tracked wrapper and shim scripts that are intentionally kept; rules for retiring them"
read_when:
  - You are about to delete or "clean up" a wrapper or stub script
  - You need to understand why scripts forward to other scripts
  - You are auditing repo hygiene and considering script removal
title: "Wrappers and shims"
---

# Wrappers and shims — bless contract

This repo intentionally keeps a small set of forwarding scripts and inert "obsolete"
shims. They look like dead code but they are not. Each entry below has an explicit
contract that operator muscle memory and at least one regression test depend on.

**Do not delete a script listed here unless you also delete the named regression
test and update every doc referenced.**

## Diagnostic forwarders

These wrappers live in `scripts/` and each one contains a single line that requires
the real implementation under `scripts/diagnostics/`:

```
scripts/<name>.js  →  scripts/diagnostics/<name>.js
```

Tracked by `scripts/test-diagnostics-script-compat.js`. Currently 14 names:

- `probe-market-data-subscriptions.js`
- `probe-six-subscription-detail.js`
- `probe-spmcha-raw.js`
- `probe-subscription-pattern.js`
- `probe-spmcha.js`
- `probe-spmcha-quotes.js`
- `debug-native-aapl.js`
- `debug-native-api-surface.js`
- `debug-native-conid-snapshot.js`
- `debug-native-contract-details.js`
- `debug-native-contract-isin.js`
- `debug-native-contract-matrix.js`
- `debug-native-contract-one.js`
- `debug-native-us-controls.js`

Why kept:

- Operator muscle memory: `node scripts/probe-spmcha.js` is the documented invocation.
- Diagnostic scripts moved under `scripts/diagnostics/` for tidier listings, but the
  flat-path invocation must continue to work.

How to retire one:

1. Update or remove `scripts/test-diagnostics-script-compat.js` so the wrapper is
   no longer in the `moved` allowlist.
2. Delete the wrapper file.
3. Search the repo for the wrapper basename and update any docs/runbooks that mention it.

## Deliberate failure shims

### `scripts/execute-trades.js`

A 1-call obsolescence redirect that prints a notice and exits with code 1.

Why kept:

- Operators with stale muscle memory still type `node scripts/execute-trades.js`.
  The shim immediately tells them which active CLI to use instead of failing with
  a misleading "module not found".
- `scripts/test-trading-guards.js` invokes the shim as part of its closed-market
  test path and asserts the exit-1 contract.
- `scripts/test-execute-trades-shim-contract.js` independently asserts the
  exit-1 contract and the obsolescence-message contract, so the shim's
  guarantees survive even if `test-trading-guards.js` is restructured.

Active CLIs to use instead:

- `scripts/submit-orders-at-open.js` — writable handoff for staged orders
- `scripts/trade.js` — CLI for individual order ops

How to retire:

1. Delete `scripts/test-execute-trades-shim-contract.js`.
2. Update `scripts/test-trading-guards.js` to no longer spawn the shim.
3. Update the four docs that mention `execute-trades`:
   - `docs/trading-workflow.md`
   - `docs/execution-command-surface.md`
   - `docs/setup/approval-gate.md`
   - `playbook.md` (if mentioned)
4. Delete the shim.

## Generated-artifact idempotence (deferred)

`CURRENT_PLAN.md` Phase 2 asked whether generated-artifact idempotence deserves
its own verification lane.

**Decision (2026-06-03): defer until concrete churn-driven failure justifies it.**

Today the following already cover most of that surface:

- `scripts/check-generated-state.js` — portfolio-controlled artifact freshness
- `scripts/test-test-manifest-shape.js` — manifest truth
- root-cleanliness verification check
- `npm test` / `npm run test:safe`

A new lane would primarily duplicate effort. Revisit if generated-artifact churn
starts producing false-red regressions in the existing lanes.
