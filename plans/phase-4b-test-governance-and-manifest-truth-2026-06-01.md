# Phase 4B — test governance and manifest truth

Status: active  
Last updated: 2026-06-01 UTC

## Objectives
- Finish the existing discovered-test infrastructure by making governance and quarantine policy explicit, versioned, and easy to audit.
- Generate or refresh a clear coverage-by-domain manifest from discovered tests.
- Add a concise human-facing governance doc describing lanes, quarantines, expectations, and artifact/idempotence coverage.
- Reduce hidden policy embedded in code so verification behavior is easier to trust and maintain.

## Risks / dependencies
- The repo already depends on discovered-test behavior; policy extraction must not silently change runnable/quarantined sets.
- Manifest generation must remain deterministic enough for repo use and tests.
- Governance docs must describe reality without over-promising “full coverage” where only lane coverage exists.
- Generated artifact idempotence should be documented truthfully if represented indirectly by existing tests instead of a single named lane.

## Actionable checklist
- [ ] Inspect discovered-test runner, manifest output, and current quarantine policy source.
- [ ] Add tests first for versioned quarantine-policy loading and manifest/domain summarization behavior.
- [ ] Move quarantine/override policy from hard-coded script data into versioned repo data.
- [ ] Add or refresh coverage-by-domain manifest generation from discovered tests.
- [ ] Add `docs/test-governance.md` describing lanes, quarantines, manifest meaning, and artifact/idempotence coverage.
- [ ] Update roadmap/checklist docs so Phase 4 reflects actual completion state.
- [ ] Run focused test-governance verification and a broader discovered-test lane as appropriate.
- [ ] Commit completed implementation and push.

## Acceptance criteria
- Quarantine policy is versioned outside the runner code.
- Coverage/test-manifest artifacts are reproducible and understandable.
- Human-facing test governance docs exist and match implemented behavior.
- Touched test/discovery scripts pass regression coverage.
- Repo status docs reflect the real Phase 4 closure state.
