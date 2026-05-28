# Phase R1 plan — repo deployability audit + safe-lane triage

## Objectives
- Verify the repository can be moved to another OpenClaw instance without missing required non-secret files.
- Separate committed source-of-truth files from generated/runtime/operator-local state.
- Diagnose and resolve the current safe-lane failures blocking a clean portability claim.
- Produce a clear deployability checklist grounded in the actual repo state.

## Risks / dependencies
- Runtime and generated artifacts are actively changing in the working tree; avoid committing noisy machine state unless intentionally required as a contract/fixture.
- Existing uncommitted WIP in `src/brokers/shared/holdingsSnapshot.js` and related FX tests may be legitimate work in progress; treat carefully and avoid accidental clobbering.
- Some failures may reflect stale manifests or fixture drift rather than code regressions; verify root cause before changing behavior.
- Portability may depend on documented setup steps rather than committed runtime state; do not commit secrets or machine-specific credentials.

## Actionable checklist
- [ ] Inventory tracked top-level directories/files needed to bootstrap another instance.
- [ ] Identify untracked/ignored-but-required artifacts, if any.
- [ ] Classify current modified files into: source, generated contract, runtime/local-only, WIP.
- [ ] Diagnose `scripts/test-test-manifest-shape.js` failure and fix manifest drift.
- [ ] Diagnose `scripts/test-broker-block-priority.js` failure and fix or document intended behavior.
- [ ] Diagnose FX-related failures:
  - [ ] `scripts/test-holdings-fx-reconciliation.js`
  - [ ] `scripts/test-ibkr-ledger-exchange-rate.js`
- [ ] Run targeted tests while iterating.
- [ ] Run `npm run test:all -- --lane=safe` until green.
- [ ] Write/update a concise deployability checklist doc if gaps or setup truths need to be captured.
- [ ] Commit and push the phase.

## Acceptance criteria
- Safe lane passes with no unexpected failures.
- Required non-secret repo files for another-instance bootstrap are committed, or any intentional external/setup dependencies are explicitly documented.
- No unnecessary runtime/secrets/local-only state is introduced into version control.
- Phase results are committed and pushed with a clear summary of remaining technical debt (if any).
