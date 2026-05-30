# Project Audit — 2026-05-30

## Purpose
This document consolidates a project-wide audit of the OpenClaw portfolio-manager repository from engineering, QA, support, documentation, operations, product, reliability, OpenClaw power-user, and future Spitex-domain perspectives.

## Implemented today

### Core system that is already real
- Portfolio-manager foundation using Markdown contracts under `portfolio/`.
- Native Interactive Brokers integration as the primary broker path.
- Guarded execution workflow with approvals, reconciliation, cancel/resync, and operator diagnostics.
- Reporting stack with dashboard, summary JSON, investor-facing email HTML/text, overview surfaces, and periodic report generation.
- Cron-backed operational flows with health/reporting/digest surfaces.
- Strong repo-local documentation and a large regression suite.

### Strongest areas
1. **Safety posture** — approval gates, blocked-state behavior, explicit live/read-only separation.
2. **Reporting** — multiple summary/reporting surfaces with meaningful operator visibility.
3. **Operational maturity** — runbooks, observability docs, cron caveats, host-specific scars captured in prose.
4. **Verification depth** — broad test inventory with lane classification and contract tests.

## Audit findings

### 1. Hard-coded and problematic patterns
- IBKR defaults are still strongly local-host oriented in `src/brokers/interactive-brokers/config.js`.
- Historical browser-session fallback remains brittle and selector-coupled in `src/brokers/interactive-brokers/browserSessionClient.js`.
- A few flows still rely on fixed temp-path patterns or shell-level coupling.
- Some naming/identity drift remained in scripts and policy wording until this audit pass.

### 2. Architecture / software engineering
- The codebase has a sensible domain split, but the operator command surface is too concentrated in `scripts/trade.js`.
- Some execution flows still call subprocess CLIs from orchestration code instead of using reusable in-process adapter APIs.
- Config loading is convenient but globally mutative (`src/shared/env.js`), which makes process/test isolation less clean than it should be.
- Generated artifacts and runtime state are valuable, but they create source-of-truth ambiguity when mixed too closely with hand-maintained code/docs.

### 3. Dead code / removal candidates
- `scripts/execute-trades.js` is an obsolete compatibility stub.
- Legacy compatibility parsing for old `Cash CHF` labels is still scattered across code paths.
- Several debug/helper scripts should be triaged into: supported tools, development-only tools, or removal.
- The repository would benefit from a clearer separation between golden fixtures and live/generated operator outputs.

### 4. QA / testing
- Test breadth is a real strength.
- The main weakness is governance: `npm test` runs a curated subset, while the total suite is much larger.
- Test policy metadata (lanes/quarantines/overrides) is more hard-coded than ideal.
- There is room for explicit coverage accounting by domain, not just a large inventory of tests.

### 5. Support / user perspective
- Operator docs are unusually good.
- The main pain point is command sprawl and mixed output contracts.
- There should be a simpler “golden path” for day-to-day operators: top commands, expected artifacts, common triage ladder.

### 6. Documentation perspective
- The repo is well documented, but canonical-truth mapping is still diffuse.
- Some docs describe historical or compatibility surfaces that should be more clearly marked.
- The repo needs one clean implementation-status/spec map for maintainers who do not want to reconstruct truth from phase history.

### 7. Operations perspective
- The system is operationally thoughtful, but still depends on host-specific assumptions that live partly in prose.
- Cron/dashboard observability should degrade gracefully **and** surface when the observability path itself is broken.
- Reliability improvements should focus on startup diagnostics, stale-state detection, and explicit recovery guidance before adding more automation.

### 8. Product / reporting perspective
- Product strength today is artifact generation and operator/investor reporting.
- The next step is usage and outcome visibility: how often reports send, how often readiness fails, how long approvals take, how often broker connectivity degrades, and which surfaces are actually used.

### 9. OpenClaw / power-user perspective
- This repo is advanced in OpenClaw-native workflow discipline.
- The weak point is fragmentation of operational knowledge across AGENTS/TOOLS/playbook/docs/skills.
- The project would benefit from a canonical host/config matrix and a smaller, clearer maintainer operating contract.

### 10. Spitex-domain transferability
There is no Spitex implementation in this codebase today.
What *is* transferable:
- Markdown contracts as explicit business control files
- approval-gated workflows
- pending-actions queue model
- health/status reporting
- conservative automation with strong auditability

What would need to be replaced:
- trading entities with patient/case/visit/staff/billing entities
- financial-market diagnostics with care-delivery SLA/compliance diagnostics
- broker integration with care systems, scheduling, billing, and note-taking integrations
- privacy/security posture hardened for medical data and role-based access

## Safe changes applied during this audit
1. Replaced stale `C3PO` wording in `scripts/test-mailgun.js`.
2. Replaced the `package.json` fixed `/tmp/answers.json` shortcut with `scripts/apply-portfolio-answers-from-temp.js`, which uses a unique temporary directory and copied input file.
3. Reconciled `config/report_delivery_policy.json` notes with the fact that the repo currently contains a live-recipient configuration.

## Recommended implementation themes
1. **CLI decomposition** — split `trade.js` into composable command modules.
2. **Config hardening** — central config matrix, fewer implicit defaults, pure config reads where possible.
3. **Observability honesty** — do not silently hide cron/health-fetch failures.
4. **Test governance** — measure domain coverage of the default gate and externalize lane/quarantine policy.
5. **Artifact hygiene** — separate source, fixtures, live outputs, and debugging tools more aggressively.
6. **Operator UX simplification** — define canonical commands and stable JSON contracts.
7. **Usage reporting** — add KPI/reporting around actual system use and friction.

## What I would remove or retire first
- `scripts/execute-trades.js` compatibility stub once path dependence is confirmed absent.
- legacy holdings parsing branches after fixture/data migration.
- unsupported ad hoc debug scripts that are not part of the maintained tool surface.
- historical/diagnostic browser-session IBKR path unless it still has a concrete operator value.
