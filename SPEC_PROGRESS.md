# Specification Progress Map

This file maps the current repository implementation to `SPECIFICATION.md` so progress can be reviewed without reading the whole codebase.

## Summary

- Overall status: meaningful MVP foundation in place with live read-only broker connectivity, but not yet live-execution-ready.
- Strongest areas: scaffolding, Markdown contracts, validation, reporting skeletons, dry-run workflow, and Interactive Brokers read-only holdings sync.
- Biggest remaining gaps: durable broker-backed execution surface, proposal deduping/supersession, scheduler wiring, and live-gated execution.
- Scope change applied: the repo now targets Interactive Brokers only for the MVP and no longer carries IG-specific implementation paths.

## Progress by specification area

| Spec area | Status | Notes |
|---|---|---|
| 4. Repository / Folder Structure | done | Portfolio, broker, config, runtime, scripts, and src layout are present and now narrowed to Interactive Brokers for the active broker path. |
| 6-10. Portfolio Markdown contracts | done | Template + real ETF portfolio files exist and validators cover required structure. |
| 11. Broker adapter interface | partial | Interface is represented in docs and partial IBKR scaffolding; implementation depth is still incomplete. |
| 12. Interactive Brokers adapter MVP | partial | Native TWS / IB Gateway socket connectivity is working in read-only mode, holdings sync is live, and current dry-run proposals use broker-backed pricing at least for EMUAA and UBSSLI. Remaining gaps are durable quote/order surface depth and completion of the execution path. |
| 13. Portfolio creation workflow | partial | Create/bootstrap/apply-answers/next-questions workflow exists, now clears the final excluded-instruments onboarding gap cleanly, and inspects real draft state. |
| 14. Strategy and ETF selection workflow | partial | Approved instruments, validation, shortlist generation, and instrument-level dry-run proposal plumbing exist, but shortlist write-back/approval flow is still light. |
| 15. Market entry workflow | partial | Staged-entry policy is modeled in Markdown and dry-run trade planning reaches instrument-level proposals; broker-aware execution remains incomplete. |
| 16. Rebalancing workflow | partial | Allocation analysis, proposal generation, dashboard updates, and safety checks exist. |
| 17. Reporting | partial | Weekly/monthly/quarterly Markdown reports and PDF placeholder files are generated. |
| 18. Scheduling | partial | Schedule docs exist and OpenClaw cron jobs are now wired for daily maintenance plus weekly/monthly/quarterly report cycles. Remaining work is operational hardening and any desired alert/delivery policy. |
| 19-20. Safety + error handling | partial | Safety checks and activation blockers exist; centralized structured runtime logging is still light. |
| 21. Template portfolio | done | `portfolio/_template/` contains the expected files and sample strategy content. |
| 22. MVP build order | in progress | Work has progressed through reporting and dry-run checks, with deeper IBKR functionality still trailing spec intent. |
| 23. Acceptance criteria | partial | Several draft-state criteria pass; broker sync, live-quality pricing, and true execution gating still need more work. |
| 24. First portfolio to create | partial | `portfolio/etf/` exists, is filled out, and is now marked active while remaining confirmation-gated and operationally read-only. It still needs execution-path hardening before it can be treated as a complete end-to-end MVP portfolio. |

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
- `scripts/propose-instrument-trades.js`
- `scripts/write-trade-proposals.js`
- `scripts/regenerate-dashboard.js`
- `scripts/write-history-snapshot.js`
- `scripts/run-report-cycle.js`
- `src/analysis/*`
- `src/reporting/*`

### Broker work
- `brokers/interactive-brokers/*`
- `scripts/test-interactive-brokers-auth.js`
- `scripts/check-interactive-brokers-config.js`
- `scripts/sync-interactive-brokers-holdings.js`
- `scripts/search-interactive-brokers-instruments.js`
- `scripts/fetch-interactive-brokers-price.js`
- `scripts/resolve-interactive-brokers-conids.js`
- `src/brokers/interactive-brokers/*`
- `src/brokers/shared/*`

## Current blockers to calling the MVP "implemented"

1. The first real portfolio is active, but the execution path is still intentionally confirmation-gated and operationally read-only.
2. Holdings are now live-synced successfully from IBKR for the ETF portfolio; remaining work is deeper quote/order surface completeness rather than basic holdings connectivity.
3. The fragile Client Portal gateway path has effectively been superseded by the native TWS / IB Gateway transport for the active integration path.
4. Interactive Brokers instrument lookup and price lookup scaffolding now exist, but durable order-quote depth, full submit/status/cancel handling, and complete approved-universe coverage still need work.
5. PDF export now has a real renderer path when Playwright/Chromium is available, but broker-backed execution evidence is still incomplete.
6. Trade proposal logic reaches instrument-level sizing, but proposal deduping/supersession and fully broker-quoted execution still need work.

## Most recent improvements

- Draft-question detection now evaluates the actual portfolio document state more carefully, so onboarding asks only for genuinely unresolved fields.
- The repo has been narrowed to Interactive Brokers-only scope for the active MVP.
- Interactive Brokers holdings sync no longer depends on IG code and now extracts CHF cash from the broker ledger when available.
- Interactive Brokers instrument search and market-snapshot pricing scaffolding are now present, with proposal sizing able to fall back safely when broker-linked contract metadata is still missing.
- Client Portal gateway/browser-session investigation is now complete enough to justify the pivot toward native TWS / IB Gateway socket API transport for durable read-only automation.
- Native IB Gateway live login, socket transport, and live read-only holdings sync are in place, and readiness checks are green again for the active path.
- Draft onboarding now reaches zero remaining questions for the ETF portfolio after explicitly recording excluded instruments as `none`.
- ETF shortlist generation now exists as a first-class workflow with ranking, rationale, risks, and suggested target splits derived from the current portfolio strategy.
- The ETF portfolio has been moved from `draft` to `active` while preserving `require_confirmation` execution mode and read-only broker usage.
- OpenClaw cron jobs are now registered for daily ETF maintenance plus weekly, monthly, and quarterly report cycles in isolated read-only runs.
