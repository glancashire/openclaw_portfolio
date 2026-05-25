# Phase 109 — Actionable Checklist

## Transport hardening
- [x] Replace global TLS env mutation with request-scoped transport behavior
- [x] Preserve localhost/self-signed IBKR access behavior
- [x] Keep non-localhost requests on normal TLS behavior

## Test coverage
- [x] Add focused tests for transport selection / scoped request behavior
- [x] Confirm no process-global TLS mutation remains in the request path
- [x] Avoid real broker dependency in the new focused tests

## Verification
- [x] Run focused transport tests
- [x] Run repo verification
- [x] Iterate until all checks pass
