---
name: combine-harvester
description: Run long, multi-hour or multi-session tasks by maintaining state in a single evolving markdown file (instructions + progress + next). Use when a task is too big for one session, when work needs to be resumable across models/agents, when stepping away and coming back is likely (refactors, migrations, audits, research, multi-phase plan execution), or when the user asks for a "combine harvester", "harvester pattern", "task journal", or a resumable working-memory file.
---

# Combine Harvester

A low-tech pattern for long-running agent tasks: keep all state in **one
markdown file** that evolves as the work progresses. Any agent — same session,
new session, different model — can pick up the task by reading the file.

## When to use

- Tasks too large to finish in a single session.
- Work the user wants to step away from and return to later.
- Multi-phase efforts: refactors, migrations, audits, research, plan execution.
- Anything where context loss between sessions would cost real time.

If the task fits comfortably in one turn, **do not** use this pattern — it adds
overhead.

## The file

One markdown file is the single source of truth. It holds three sections:

1. **Instructions** — goal, constraints, success criteria, links to source material.
2. **Progress** — what's been done, decisions made, dead ends, reflections.
3. **Next** — the immediate next step(s), open questions, blockers.

The file evolves with the work. Treat it as working memory, not a final report.

## Workflow

### Starting a task

1. Pick a location. Default: `tasks/<slug>.md` at the repo root, or alongside
   the relevant project. Use a hyphenated slug.
2. Copy `assets/harvester-template.md` from this skill as the starting point.
3. Fill in **Goal**, **Success criteria**, and the first **Next** step.
4. Set status to `active` and stamp `Last updated` with today's date (UTC).
5. Commit the file before doing any work — it's the contract.

### Working a batch

1. **Read the file first.** Always. Even if you wrote it yourself last session.
2. Do the next step (or a small batch of steps).
3. **Update the file before stopping**, even if interrupted:
   - Move completed items from **Next** into **Progress**.
   - Write down decisions and dead ends — future-you will thank you.
   - Rewrite **Next** so the resuming agent knows exactly what to do first.
   - Bump `Last updated`.
4. Commit. The commit message should reference the task slug.

### Reflecting (optional but valuable)

Every few batches, or when something felt off, add a short **Reflection** entry
under Progress: what worked, what didn't, what to change. Then update
**Instructions** or **Next** to reflect the lesson. The retrospective lives in
the file so it survives.

### Finishing

1. Final batch lands; **Next** is empty.
2. Set status to `done` and add a one-paragraph summary at the top.
3. Commit. Optionally archive to `tasks/done/`.

## Conventions

- **Status** values: `active`, `paused`, `blocked`, `done`.
- **Last updated** uses ISO date (UTC), e.g. `2026-05-27`.
- Keep **Next** short and concrete — one or two steps the resuming agent can
  start on without re-reading everything.
- Prefer prepending new Progress entries (newest on top) so the recent context
  is immediately visible.
- If the file grows past ~500 lines, archive older Progress into
  `tasks/<slug>-archive.md` and link from the main file.

## Subagent pairing

This pattern composes well with subagents:

- Spawn a subagent with a task like:
  _"Read `tasks/<slug>.md`, do the next batch, update the file, commit, exit."_
- The subagent never needs the parent's transcript — the file is the context.
- Multiple subagents can take consecutive batches as long as each one updates
  and commits before exiting.

## Anti-patterns

- **Doing work without updating the file.** Defeats the whole pattern.
- **Treating the file as a final report.** It's working memory; messiness is fine.
- **Putting everything in one giant Next blob.** Future-you needs a clear
  starting point, not a wall of TODOs.
- **Skipping the read.** Always re-read before acting; the file is ground truth,
  not your memory of it.

## Template

See `assets/harvester-template.md` for the starting structure. Copy it to
`tasks/<slug>.md` and fill in the brackets.

## Origin

Pattern described by Matej; adopted in this repo 2026-05-27. Nicknamed
"combine harvester" because it chews through long tasks one row at a time and
the operator can hop on or off without losing the harvest.
