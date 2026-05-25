# Phase 105 — Actionable Checklist

## Effective-config / authority surface
- [x] Add a reusable execution-authority/effective-config summary module.
- [x] Include portfolio status, execution mode, account reference, approval gates, holdings health, broker readiness, runtime pause state, and live-arm state.
- [x] Expose the summary through a canonical CLI command.
- [x] Support JSON output and clear human-readable output.

## Consistency and documentation
- [x] Ensure the authority output uses existing canonical parsers/helpers instead of duplicating policy logic.
- [x] Document the new canonical command in the operator command surface doc.
- [x] Keep the surface fail-closed and diagnostic-only.

## Verification
- [x] Add focused tests for effective-config/execution-authority output.
- [x] Run new tests plus repo verification.
- [x] Iterate until all checks pass.
- [x] Commit Phase 105 implementation.
- [x] Push Phase 105.
