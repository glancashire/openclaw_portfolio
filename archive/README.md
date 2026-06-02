# Archive

Historical material that should not read like live work.

## Layout

- `archive/phase-plans/` - completed phase plans, old implementation roadmaps, legacy specifications, and other per-phase build history
- `archive/docs/` - historical audits, superseded roadmaps, and retired current-looking docs
- `archive/tasks/` - archived harvesters, wave plans, and working-memory task notes

## Rules

- Do not link to archived files from the live operator surfaces unless the point is historical context.
- If a historical plan becomes active again, move it back into the live current-doc set with a fresh status banner instead of editing it in place inside the archive.
- Prefer `git mv` so history stays intact.

## Search tips

```bash
git log --follow -- archive/phase-plans/<file>.md
git grep 'search term' archive/
```
