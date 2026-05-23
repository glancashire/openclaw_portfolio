# Phase 220 — runtime ephemeral churn clarity

## Objectives
- Make the stable-vs-ephemeral runtime boundary explicit so verification and evidence generation are easier to interpret.
- Reduce confusion from runtime event churn by documenting which files are intentionally volatile and which are leave-behind evidence.
- Keep the repo in a calm state where new usage evidence is easy to gather without mistaking normal runtime updates for regressions.

## Risks / dependencies
- Runtime event logs are intentionally append-only; they should not be suppressed or turned into fake static files.
- Documentation and helper changes must not hide genuine runtime state changes.
- Any file classification changes need to preserve operator-facing evidence that is intentionally versioned under runtime/overview and portfolio/.

## Actionable checklist
- [ ] Audit the runtime files that continue to change during verification and classify them as ephemeral or versioned evidence.
- [ ] Add/update a small helper or test that clearly distinguishes expected ephemeral churn from versioned artifact regressions.
- [ ] Refresh operator docs / notes to describe the runtime split and how to interpret the remaining dirty set after verification.
- [ ] Add regression coverage proving the helper/classification logic recognizes the expected ephemeral files.
- [ ] Re-run focused checks and full verification, then commit and push.

## Acceptance criteria
- The stable-vs-ephemeral runtime split is explicitly documented.
- The repo clearly distinguishes intentional runtime log churn from true evidence regressions.
- Regression coverage exists for the classification logic.
- Focused tests pass and the repository remains usable for leave-behind evidence gathering.
