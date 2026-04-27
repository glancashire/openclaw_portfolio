# Portfolio Manager Implementation Plan

## Current completed phases

1. Repo scaffolding
2. Template portfolio files
3. Markdown parser/generator foundation
4. Portfolio-folder contract validation
5. Draft bootstrap helper for portfolio creation from structured input

## Next phases

### Phase 4 — Strategy validation
Implement validators for:
- unresolved placeholders
- missing investor profile details
- invalid execution modes
- out-of-range allocation targets
- inconsistent min/target/max values
- missing risk limits
- missing approved instruments for active portfolios

### Phase 5 — Interactive portfolio creation workflow
Add a workflow layer that:
- asks only for missing answers
- writes/update `portfolio/<name>/portfolio.md`
- leaves unresolved questions explicit
- can resume from an existing draft

### Phase 6 — IG adapter design skeleton
Create:
- normalized account/holding/order shapes
- adapter interface code stubs
- safe logging rules
- read-only + dry-run first workflow

### Phase 7 — Dashboard/report regeneration helpers
Add generation logic for:
- allocation summaries
- drift analysis placeholders
- report skeleton emission by period

## Current command surface

- `node scripts/validate-portfolio.js <portfolio.md>`
- `node scripts/validate-portfolio-folder.js <portfolio-folder>`
- `node scripts/create-portfolio.js <portfolio-name>`
- `node scripts/bootstrap-portfolio-from-json.js <seed.json>`

## Guardrails

- No secrets in Markdown.
- No live trading shortcuts.
- Keep ETF-only / CHF-first MVP scope.
- Unknown or unresolved strategy details should block activation and trading.
