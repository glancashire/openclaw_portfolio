# Phase 2 — Configuration and environment hardening

## Objective
Harden configuration loading by separating pure workspace env reads from mutating bootstrap behavior, centralizing Interactive Brokers defaults in one place, documenting the active config matrix, and extending TLS guard coverage so local-only certificate relaxations never bleed to non-loopback hosts.

## Risks / dependencies
- Many scripts already call `loadWorkspaceEnv()` implicitly; preserve backward compatibility while introducing a pure reader.
- IBKR defaults currently live inline in `src/brokers/interactive-brokers/config.js`; refactoring must not change the effective runtime config unexpectedly.
- Documentation should reflect actual code truth, not aspirational config knobs.
- Keep this phase source/docs/tests focused; avoid dragging generated/runtime churn into the commit.

## Action checklist
- [ ] Add a pure env-reader helper alongside the existing mutating loader in `src/shared/env.js`.
- [ ] Refactor IBKR config loading to centralize defaults/constants and consume the pure env reader without changing effective behavior.
- [ ] Add/extend tests for env parsing, pure-vs-mutating load behavior, config default selection, and non-loopback TLS guard behavior.
- [ ] Write `docs/config-matrix.md` documenting the active environment/config surface and IBKR defaults.
- [ ] Run focused tests, safe lane, and repo verification until green.
- [ ] Commit and push the phase cleanly.

## Acceptance criteria
- Code can read workspace env values without mutating `process.env`.
- `loadWorkspaceEnv()` remains backward compatible for existing callers.
- IBKR host/port/baseUrl/runtime defaults are defined once and tested.
- TLS relaxation remains scoped to loopback HTTPS only, with explicit regression coverage.
- `docs/config-matrix.md` accurately documents the active config matrix.
