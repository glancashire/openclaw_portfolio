# Artifact Policy Contract

_Last updated: 2026-05-10 13:39 UTC_

This document defines how the repository treats source files, derived versioned artifacts, and runtime ephemeral artifacts.

## 1. Source-of-truth files

Source-of-truth files are intentionally edited and reviewed by humans or canonical workflows.
They include:
- portfolio Markdown contracts such as `portfolio/<name>/portfolio.md`, `holdings.md`, `trades.md`, and `history.md`
- implementation/source code under `src/`, `scripts/`, `tests/`, and relevant docs/plans
- operator policy/config notes such as `system-policy.md` and `config/openclaw.md`

These files should be treated as primary review material.

## 2. Derived but versioned artifacts

Some generated artifacts are intentionally committed because they are part of the operator-facing surface and contract.
These currently include examples such as:
- `portfolio/<name>/summary.json`
- `portfolio/<name>/summary.html`
- `portfolio/<name>/recovery-checklist.json`
- `portfolio/<name>/recovery-checklist.md`
- `portfolio/<name>/recovery-checklist.html`
- `runtime/overview/*.json`
- `runtime/overview/*.md`
- `runtime/overview/*.html`

These are derived from source state and canonical generators, but they remain useful reviewable outputs.
Changes to them should ideally accompany the source changes that caused the regeneration.

## 3. Runtime-ephemeral artifacts

Some runtime files are operational state or event churn and should be treated as ephemeral unless a phase intentionally refreshes them.
Examples include:
- `runtime/events/runtime-events.jsonl`
- `runtime/execution-state.json`
- transient queue/runtime traces that exist only to support current execution safety and observability

These may change during verification or normal operation without representing meaningful source edits.

## 4. Commit hygiene expectations

The repository currently mixes source and generated outputs by design.
That means clean commit hygiene depends on intentional staging.

Preferred practice:
- stage source changes deliberately
- include derived versioned artifacts when they are the intended product of the phase
- avoid sweeping runtime-ephemeral churn into unrelated commits

## 5. Verification expectation

Verification should continue to tolerate truthful regeneration, but the repository should keep explicit contracts for which artifacts are expected to be reviewable versus operational noise.
This policy exists to reduce ambiguity, not to hide generated behavior.

## 6. Current posture

Current repo practice intentionally keeps some operator-facing generated artifacts versioned.
Runtime event/state churn still exists and is expected.
The right near-term policy is explicit classification and careful staging, not pretending all generated output should be ignored.
