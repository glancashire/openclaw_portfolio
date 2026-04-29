# Specification Progress Map

This file maps the current repository implementation to `SPECIFICATION.md` so progress can be reviewed without reading the whole codebase.

## Summary

- Overall status: meaningful MVP foundation in place, but not execution-ready.
- Strongest areas: scaffolding, Markdown contracts, validation, reporting skeletons, dry-run workflow.
- Biggest remaining gaps: ETF shortlist workflow depth, broker normalization maturity, instrument-level order quoting, and true PDF export/live-gated execution.

## Progress by specification area

| Spec area | Status | Notes |
|---|---|---|
| 4. Repository / Folder Structure | done | Portfolio, broker, config, runtime, scripts, and src layout are present. |
| 6-10. Portfolio Markdown contracts | done | Template + real ETF portfolio files exist and validators cover required structure. |
| 11. Broker adapter interface | partial | Interface is represented in docs and scaffolding, but implementation depth is uneven by broker. |
| 12. IG broker adapter MVP | partial | Docs and auth/test scaffolding exist; read-only adapter is not yet complete. |
| 13. Portfolio creation workflow | partial | Create/bootstrap/apply-answers/next-questions workflow exists; now improved to inspect draft state instead of returning only a static checklist. |
| 14. Strategy and ETF selection workflow | partial | Approved instruments and validation exist, but shortlist/scoring workflow is still light. |
| 15. Market entry workflow | partial | Staged-entry policy is modeled in Markdown and dry-run trade planning exists; broker-aware execution remains incomplete. |
| 16. Rebalancing workflow | partial | Allocation analysis, proposal generation, dashboard updates, and safety checks exist. |
| 17. Reporting | partial | Weekly/monthly/quarterly Markdown reports and PDF placeholder files are generated. |
| 18. Scheduling | partial | Schedule docs and report-job docs exist; scheduler wiring is not yet fully automated in OpenClaw. |
| 19-20. Safety + error handling | partial | Safety checks and activation blockers exist; centralized structured runtime logging is still light. |
| 21. Template portfolio | done | `portfolio/_template/` contains the expected files and sample strategy content. |
| 22. MVP build order | in progress | Work has progressed through reporting and dry-run checks, with broker depth still trailing spec intent. |
| 23. Acceptance criteria | partial | Several draft-state criteria pass; broker sync, live-quality pricing, and true execution gating still need more work. |
| 24. First portfolio to create | partial | `portfolio/etf/` exists and is filled out as a draft, still blocked from activation. |

## Concrete evidence in repo

### Portfolio/state foundation
- `portfolio/_template/*`
- `portfolio/etf/*`
- `src/markdown/*`
- `scripts/create-portfolio.js`
- `scripts/bootstrap-portfolio-from-json.js`

### Validation and safety
- `scripts/validate-portfolio.js`
- `scripts/validate-strategy.js`
- `scripts/check-portfolio-activation.js`
- `scripts/check-generated-state.js`
- `scripts/check-safety-controls.js`
- `src/validation/*`

### Workflow helpers
- `scripts/next-portfolio-questions.js`
- `scripts/apply-portfolio-answers.js`
- `src/workflows/*`

### Analysis/reporting
- `scripts/propose-trades.js`
- `scripts/write-trade-proposals.js`
- `scripts/regenerate-dashboard.js`
- `scripts/write-history-snapshot.js`
- `scripts/run-report-cycle.js`
- `src/analysis/*`
- `src/reporting/*`

### Broker work
- `brokers/ig/*`
- `brokers/interactive-brokers/*`
- `scripts/test-ig-auth.js`
- `scripts/check-ig-config.js`
- `scripts/test-interactive-brokers-auth.js`
- `scripts/check-interactive-brokers-config.js`
- `scripts/sync-interactive-brokers-holdings.js`

## Current blockers to calling the MVP "implemented"

1. The first real portfolio is still `draft`, not safely activatable.
2. Holdings/pricing are still simulated in the generated state.
3. IG adapter implementation is behind the documentation/spec intent.
4. PDF export is a placeholder companion file, not a real renderer.
5. Trade proposal logic is still mostly allocation-driven rather than fully broker-quoted instrument execution.

## Most recent improvement

- Draft-question detection now evaluates the actual portfolio document state more carefully, so onboarding can ask only for genuinely unresolved fields instead of treating default table scaffolds as complete answers.
