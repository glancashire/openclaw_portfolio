# Phase 161 — Contract intelligence observability

## Goal
Expose contract-intelligence gaps and resolved venue identity details in operator-facing diagnostics so native IBKR contract resolution quality is visible in summary/reporting surfaces instead of being buried in raw scripts.

## Why this phase
Phase 160 created a reusable native contract-intelligence normalization layer, but operators still cannot easily see whether approved instruments are missing durable IBKR identity fields or which venue/conid metadata is backing an instrument. The next safe step is observability: surface contract-intelligence readiness and gaps in summary artifacts, dashboards, and queue-like diagnostics without changing live execution behavior.

## Scope
- Add a small read-only contract-intelligence reporting helper that inspects approved instruments for:
  - missing `ibkrConid`
  - missing `ibkrSymbol`
  - missing exchange / venue identity where IBKR execution metadata is expected
  - available normalized identity summary when fields are present
- Integrate that helper into existing operator/reporting surfaces with concise summaries, not giant dumps.
- Surface missing contract identity as operator-actionable warnings / data items where appropriate.
- Add focused regression tests covering summary/reporting output and queue classification.

## Non-goals
- No broker writes or live execution behavior changes.
- No browser-session / Client Portal dependency.
- No automatic contract lookup or mutation of portfolio markdown.
- No large new dashboard section that duplicates existing instrument tables.

## Design notes
- Keep the helper pure and markdown-driven.
- Prefer short aggregate counts plus 1–3 concrete examples.
- Treat contract-intelligence issues as data-quality/operator-readiness concerns unless they are already coupled to an execution blocker.
- Reuse the normalized identity language from Phase 160 (`conid`, `symbol`, `venue`, `venueKey`) where it helps.

## Verification plan
- Add focused tests for the helper classification output.
- Update summary/reporting tests to assert contract-intelligence visibility.
- Re-run focused reporting/overview/CLI regression checks until green.
