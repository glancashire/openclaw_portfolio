# Phase 2 — artifact hygiene and legacy surface retirement

Date: 2026-06-03
Status: ACTIVE
Source: `CURRENT_PLAN.md` Phase 2

## Objectives

Close the four open items from `CURRENT_PLAN.md` Phase 2:

1. Decide whether `scripts/execute-trades.js` should be removed or kept as a deliberate failure shim.
2. Audit tracked wrapper/compatibility scripts and either bless, archive, or remove them.
3. Tighten source-vs-generated-vs-fixture boundaries where git churn is still high.
4. Decide whether generated-artifact idempotence deserves a named verification lane.

## Decisions made up front

### Decision 1: Keep `scripts/execute-trades.js`

Keep it as the explicit failure shim it already is. Removal would:

- break `scripts/test-trading-guards.js` which spawns the file expecting `exit 1`
- require updating 4 docs that already correctly call it obsolete
- gain nothing — the file is 12 lines and obviously inert

Add a docstring tightener so the rationale is in-file, not just in commentary.

### Decision 2: Wrappers stay where the test contract lives

`scripts/test-diagnostics-script-compat.js` already enforces that 14 named diagnostic
wrappers continue to exist in `scripts/` and forward to `scripts/diagnostics/`. That's
the bless contract. We will not retire those wrappers; doing so would break the
compat lane and is not what the operator wants for muscle memory.

### Decision 3: Generated-artifact idempotence — defer naming a separate lane

The repo already has:

- `scripts/check-generated-state.js` for portfolio-controlled artifacts
- `scripts/test-test-manifest-shape.js` for manifest truth
- a root-cleanliness verification check
- `npm test` and `npm run test:safe` lanes that cover regenerated artifacts

A separate "idempotence lane" would primarily duplicate work. Defer until concrete
churn-driven failures justify naming it. Track this decision in `playbook.md`.

## Work plan (actionable checklist)

- [ ] Add a clear docstring + comment block to `scripts/execute-trades.js` explaining
  it is a deliberate failure shim used by `scripts/test-trading-guards.js`.
- [ ] Audit current wrapper/compatibility scripts beyond the diagnostics-compat list:
  scan `scripts/` for files that just `require('./diagnostics/...')` or otherwise
  forward to a real implementation.
- [ ] Document the bless contract in `docs/operations/repo-map.md` (or a new
  `docs/operations/wrappers.md`) so future cleanup attempts know not to delete them.
- [ ] Add a small regression test asserting `scripts/execute-trades.js` exit-1 contract
  (a tiny smoke test parallel to `test-trading-guards.js` so the contract is
  verified even if `test-trading-guards.js` ever changes shape).
- [ ] Tighten the source-vs-generated boundary by adding `.gitignore` entries for
  any generated artifact directories that currently churn outside `runtime/` and
  `portfolio/<name>/reports/` — only if found.
- [ ] Update `playbook.md` with the deferred-lane decision so it is durable.
- [ ] Update `CURRENT_PLAN.md` Phase 2 to mark items closed with the chosen disposition.

## Risks

- **Touching the wrappers or shim risks breaking compat tests.** Mitigation: only
  add docstrings/comments and a new test; do not change behaviour.
- **`.gitignore` entries can silently exclude needed files.** Mitigation: only add
  them where there is visible existing churn pattern, never broad globs.

## Acceptance criteria

- `npm test` stays green.
- `npm run test:safe` stays green.
- `scripts/execute-trades.js` has a clear top-of-file rationale block.
- A wrapper-bless reference exists in docs.
- A new tiny regression test validates the execute-trades exit-1 contract.
- `CURRENT_PLAN.md` Phase 2 reflects what is now closed.
- `playbook.md` records the deferred-lane decision.
