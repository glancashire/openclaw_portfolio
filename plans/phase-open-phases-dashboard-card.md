# Phase plan — Open phases dashboard card

## Objective
Add a first-class Open Phases card/surface to the repo’s generated operator dashboard artifacts so the Control UI/operator cockpit can show the real remaining phase state without relying on stale ad hoc markdown.

## Why now
- Graham explicitly asked to "make those" after the open-phase cleanup.
- We already corrected phase truth in `OPEN_PHASES_OVERVIEW.md` and `PHASE_OVERVIEW.md`.
- The repo already has an overview/overview-cockpit generation pipeline; that is the right durable integration point.

## Scope
- Add a reporting module that parses `OPEN_PHASES_OVERVIEW.md` into structured dashboard-friendly data.
- Render an Open Phases section/card in generated overview markdown/html.
- Add tests for parsing + rendering + generated overview inclusion.
- Regenerate the runtime overview artifacts for verification.

## Out of scope
- Patching OpenClaw packaged/minified `dist/control-ui` bundle files directly.
- Rewriting the upstream OpenClaw product UI.
- Taking over blocked external-infra items.

## Risks / dependencies
- `OPEN_PHASES_OVERVIEW.md` is human-authored; parser should be tolerant and fail soft.
- Must not break existing overview artifact contracts.
- Should not drag runtime/generated artifacts into commits unless intentionally regenerated for verification only.

## Checklist
- [ ] Inspect current overview artifact pipeline and choose insertion point.
- [ ] Implement parser/renderer for open phases.
- [ ] Integrate section into overview markdown.
- [ ] Add focused tests.
- [ ] Run focused tests.
- [ ] Run safe lane if integration touches broad reporting behavior.
- [ ] Commit and push.

## Acceptance criteria
- Generated `runtime/overview/portfolio-overview.md` includes an Open Phases section.
- Generated html overview also includes the section.
- Tests cover both non-empty and tolerant/empty parsing behavior.
- No existing dashboard overview tests regress.
