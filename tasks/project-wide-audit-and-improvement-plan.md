# Project-wide audit and improvement plan

- Status: active
- Last updated: 2026-05-30

## Goal
Audit the entire project from engineering, QA, support, docs, operations, product, reliability, OpenClaw/skill-power-user, and Spitex domain perspectives; identify hard-coded/problematic patterns, dead code, reliability gaps, feature opportunities, and documentation/spec improvements; consolidate the findings into a clear improvement plan ready for implementation.

## Success criteria
- Produce a grounded audit with concrete evidence from the codebase and docs.
- Surface risky hard-coded/problematic patterns and fix the highest-confidence issues that are safe to change autonomously.
- Produce clean documentation/specs describing what is implemented today and what should improve next.
- Produce a phased improvement plan that is specific enough to begin implementing.

## Constraints
- Prefer source/docs/tests changes over generated artifact churn unless directly relevant.
- Ask before destructive or irreversible changes.
- Live broker/write behavior stays safety-first.

## Progress
- 2026-05-30: Created harvester for the project-wide audit and improvement pass.

## Next
1. Inspect repo shape, current phase/task docs, and likely hotspots for hard-coded/problematic patterns.
2. Delegate a code-reading audit batch to a subagent to gather grounded findings by area.
3. Fix any clearly safe high-confidence issues found during the audit, then write the consolidated documentation/spec/improvement plan.
