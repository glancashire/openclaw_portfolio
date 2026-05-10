# Phase 109 — IBKR HTTP Transport Hardening

_Last updated: 2026-05-10 13:46 UTC_

## Goal

Remove the global `NODE_TLS_REJECT_UNAUTHORIZED` mutation from the Interactive Brokers HTTP client and replace it with request-scoped transport behavior.

## Why this phase matters

The audit identified one of the clearest real engineering hazards left in the repo:
`src/brokers/interactive-brokers/client.js` currently mutates process-global TLS behavior during HTTP requests.

That is risky because it can:
- affect unrelated requests in the same process
- make failures harder to reason about
- create surprising security posture drift outside the IBKR call site

This phase hardens the broker transport layer without widening broker permissions or changing live-execution policy.

## Scope

1. Introduce request-scoped HTTP transport behavior for localhost IBKR HTTPS calls.
2. Remove process-global TLS env mutation from the HTTP client.
3. Preserve current behavior for local/self-signed IBKR gateway access.
4. Add focused tests for transport selection / request behavior.
5. Run repo verification.

## Non-goals

- no live execution enablement
- no broker write policy changes
- no broader broker adapter redesign
- no migration away from `fetch`

## Intended outputs

- hardened request helper in the IBKR client
- no more `NODE_TLS_REJECT_UNAUTHORIZED` mutation in request flow
- focused tests proving the request path still works as intended
- repo verification passing unchanged

## Done criteria

This phase is done when:
- the IBKR client no longer mutates global TLS env state
- localhost HTTPS relaxation is request-scoped only
- focused tests pass
- full repo verification passes
