# Test Governance

Canonical entry point for how verification works in this repo.

## Purpose

Use this file when you need the human-facing explanation of:
- which test lanes exist
- what `npm test` actually runs
- where lane and quarantine policy lives
- how the generated manifest and coverage summary fit together

Detailed lane semantics and examples live in `docs/operations/test-lanes.md`.

## Canonical sources

- `docs/operations/test-lanes.md` — lane definitions, runner behavior, and operator usage
- `config/test-discovery-policy.json` — versioned scan/skip/override/quarantine policy
- `docs/operations/test-manifest.json` — generated per-test lane classification source of truth
- `docs/operations/test-coverage-by-domain.json` — naming-based coverage transparency summary
- `src/reporting/verifyRepoChecks.js` — curated always-green pre-commit gate

## Default verification flows

- `npm test`
  Runs the curated `verifyRepoChecks` gate. This is the cheapest always-green repo check.
- `npm run test:all`
  Runs discovered tests in the default broad sweep (`safe + integration`).
- `npm run test:all -- --lane=safe`
  Runs the broad network-free safe lane only.
- `npm run test:all -- --lane=live-smoke`
  Opt-in. Touches IBKR/open-network surfaces.
- `npm run test:all -- --lane=external`
  Opt-in. Can send real external email/API traffic.

## Governance rules

- Change lane/quarantine policy in `config/test-discovery-policy.json`, not in ad hoc runner code.
- Regenerate artifacts with `node scripts/discover-test-suites.js` after adding tests or changing policy.
- Treat `docs/operations/test-manifest.json` as generated truth, not hand-edited policy.
- Keep quarantines explicit, versioned, and justified.
- Prefer fixing or removing curated-gate failures over quarantining them.

## Drift checks

The curated gate already verifies the discovery artifacts via `scripts/test-test-manifest-shape.js`.
This file is intentionally small and stable: it exists so humans have one obvious place to start before dropping into the lower-level ops docs.
