# Phase 105 — Actionable Checklist

## Effective-config / authority surface
- [ ] Add a reusable execution-authority/effective-config summary module
- [ ] Include portfolio status, execution mode, account reference, approval gates, holdings health, broker readiness, runtime pause state, and live-arm state
- [ ] Expose the summary through a canonical CLI command
- [ ] Support JSON output and clear human-readable output

## Consistency and documentation
- [ ] Ensure the authority output uses existing canonical parsers/helpers instead of duplicating policy logic
- [ ] Document the new canonical command in the operator command surface doc
- [ ] Keep the surface fail-closed and diagnostic-only

## Verification
- [ ] Add focused tests for effective-config/execution-authority output
- [ ] Run new tests plus repo verification
- [ ] Iterate until all checks pass
