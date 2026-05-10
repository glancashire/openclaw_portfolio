# Phase 109 — Actionable Checklist

## Transport hardening
- [ ] Replace global TLS env mutation with request-scoped transport behavior
- [ ] Preserve localhost/self-signed IBKR access behavior
- [ ] Keep non-localhost requests on normal TLS behavior

## Test coverage
- [ ] Add focused tests for transport selection / scoped request behavior
- [ ] Confirm no process-global TLS mutation remains in the request path
- [ ] Avoid real broker dependency in the new focused tests

## Verification
- [ ] Run focused transport tests
- [ ] Run repo verification
- [ ] Iterate until all checks pass
