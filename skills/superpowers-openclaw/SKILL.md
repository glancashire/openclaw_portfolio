---
name: superpowers-openclaw
description: Adapt spec-first, plan-first, test-first, review-first software delivery to OpenClaw workspace projects. Use when building or changing software, especially before coding, when turning goals into specs/plans, when deciding whether to use subagents, or when enforcing verification and review discipline.
---

# Superpowers for OpenClaw

Use this skill as the default delivery workflow for software/project work in this workspace.

## Core principles

- Start with the real goal, not the first implementation idea.
- Prefer a short written spec before code for anything non-trivial.
- Prefer a concrete written plan before multi-file or risky changes.
- Prefer small, auditable steps over big leaps.
- Prefer verification evidence over confidence.
- Prefer subagents for code-heavy reading, implementation batches, or long-running execution.
- Keep safety gates explicit when work touches brokers, automation, secrets, or external side effects.

## Default workflow

1. Clarify the objective and constraints.
2. Write or update a spec/design note when the task is non-trivial.
3. Write or update a plan file before broad implementation.
4. Break work into small steps with clear verification.
5. Execute one step at a time or delegate batches to subagents.
6. Review results against the spec/plan.
7. Verify with the smallest meaningful gate: test, lint, build, diff, inspection, screenshot, or log evidence.
8. Only then present completion.

## When to create a spec first

Create a spec/design note first when any of these are true:
- the user is still exploring what to build
- requirements are ambiguous
- the change affects multiple modules or files
- the work has safety, finance, broker, or automation risk
- the work may take more than one implementation session

Keep specs readable and short. Present them in chunks if long.

## When to create a plan first

Create a plan before implementation when any of these are true:
- more than one file will change
- the change needs sequencing
- verification is non-obvious
- subagents will be used
- rollback or safety gates matter

Store plans in files rather than only chat when they may be reused.

## Delegation rules

- Use subagents for code-heavy repo reading, repetitive edits, or parallelizable tasks.
- Keep main-session context focused on goals, plans, decisions, and results.
- Ask subagents for evidence, not just conclusions.
- If work is long-running or spans waits, prefer TaskFlow patterns.

## Verification rules

Never declare success from intent alone.

Before completion, gather at least one of:
- passing test output
- successful lint/typecheck/build output
- direct file inspection or diff evidence
- browser/canvas screenshot evidence
- broker/readiness/log inspection for integration work

If no gate can run, say why.

## Review rules

After implementation, compare results against:
- the requested goal
- the written spec if present
- the written plan if present
- safety constraints and approval gates

Call out:
- scope drift
- unverified assumptions
- follow-up risks
- what remains blocked or deferred

## OpenClaw-specific guidance

- Use local workspace skills before inventing process.
- For portfolio-manager work, use `portfolio-orchestrator` first, then `portfolio-markdown-contracts` as needed.
- Use `taskflow` when detached work needs durable state, waits, or child-task coordination.
- For ACP-harness requests, route through `sessions_spawn` with `runtime="acp"`.
- Prefer plans/specs saved to files so future sessions can resume cleanly.

## Outputs

Prefer producing one of these artifacts when appropriate:
- spec note
- implementation plan
- checklist with verification gates
- delegated subagent task prompt
- completion note with evidence and remaining risks
