# Dashboard email — Themeforest-inspired light/dark redesign plan

Date: 2026-06-03
Owner: bb8 / Graham
Status: DRAFT (no code changes yet)
Scope: visual redesign of the daily/weekly dashboard digest HTML email only. No data, schedule, or delivery logic changes.

## Why

Current rendering (`src/reporting/dashboardDigest.js`, ~541 LOC of inline-styled HTML) is content-correct and fully readable. Graham's feedback after the 2026-06-03 daily send: looks good in content, but the visual treatment should be **lighter, more beautiful, and adaptive to dark and light mode**. This plan captures the redesign without touching the data layer or the send pipeline.

## Goals

1. Lighter visual weight (less heavy slabs, less navy gradient, more whitespace).
2. Modern Themeforest-style fintech-dashboard email aesthetic: airy, cards with soft shadow, restrained color use, generous typography hierarchy.
3. **Both light and dark mode adaptive** in supporting clients (Apple Mail, iOS Mail, Outlook for Mac, modern Gmail web/iOS, Spark, Hey, Thunderbird).
4. Email-safe HTML — must still survive Outlook Windows / Outlook 365 desktop and Gmail (no flexbox/grid in critical layout, no `<style>`-only color theming for legacy clients, table-based skeleton kept).
5. Zero regression in: subject, recipients, send pipeline, delivery executor, dedup keys, mailgun integration.

## Non-goals

- No new metrics, sections, or data sources.
- No change to `frequency=daily|weekly` semantics.
- No template engine swap (stays inline-styled HTML in JS).
- No new fonts that require external requests (keep system stack).
- No hero images (email image blocking + dark-mode image issues).

## Reference research (Themeforest / fintech email patterns)

Themeforest "dark dashboard" / "fintech admin" templates that match the target vibe:

- **Velzon — Admin & Dashboard Template** (Themeforest top seller). Light + dark, soft shadow cards, accent-blue, generous gutters.
- **Oxfin — Bootstrap Dark Admin Dashboard**. Restrained palette, monochrome cards, single accent.
- **RiskEdge Pro — React Trading Dashboard UI Kit**. Trading-tuned, signed-PnL color tokens, subtle hairline tables.
- **Mediqu — Dashboard Template Dark/Light with RTL**. Reference for token-paired light/dark surfaces.
- **DarkStar — Multipurpose Dark HTML Template**. Soft hero, off-black surfaces (not pure #000).

Patterns to borrow (not assets, just patterns):

- Off-white (`#f7f8fb`) light surface, off-black (`#0b1220`) dark surface — never pure white / pure black.
- Single accent (blue or teal) used sparingly for the value KPI and section eyebrows. Reds/greens reserved exclusively for signed PnL.
- Hairline table dividers (1px @ 6–8% contrast) instead of heavy banded rows.
- 14–15 px body, 12 px metadata, 11 px uppercase eyebrow with letter-spacing, 28–32 px hero number.
- Soft shadow `0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)` in light; remove shadow + use 1px border in dark.
- Rounded 12–16 px on cards; 999 px on pill chips.

## Light / dark mode strategy (email-safe)

Email dark mode is messy. Three layers:

1. **`prefers-color-scheme` media query** (Apple Mail, iOS Mail, Outlook macOS, Spark, Hey, Thunderbird, modern Gmail iOS partial). Uses `<style>` block with class-based overrides.
2. **`@media (prefers-color-scheme: dark)` background-image swap trick** for backgrounds that must invert.
3. **`[data-ogsc]` and `[data-ogsb]` selectors** for Outlook.com / Outlook 365 web dark-mode inversion.

Plus the Gmail/Outlook fallback:

- All inline styles use a "neutral" light palette by default.
- A `<style>` block with `@media (prefers-color-scheme: dark) { … }` flips palette using class hooks (`.t-surface`, `.t-text`, `.t-muted`, `.t-card`, `.t-divider`, `.t-pos`, `.t-neg`, `.t-accent`).
- Keep fallback inline colors readable in both modes (mid-contrast, no near-black on near-white-only assumptions).
- Use `meta name="color-scheme" content="light dark"` and `meta name="supported-color-schemes" content="light dark"`.

## Design tokens (proposed)

Light:

- surface 0: `#ffffff`
- surface 1: `#f7f8fb` (page bg)
- surface 2: `#eef1f6` (subtle band)
- text: `#0f172a`
- muted: `#64748b`
- border / divider: `#e6e9ef`
- accent: `#2563eb`
- positive: `#15803d`
- negative: `#b91c1c`

Dark:

- surface 0: `#0f1623` (card)
- surface 1: `#0b1220` (page bg)
- surface 2: `#131c2e`
- text: `#e6ecf5`
- muted: `#9aa6b8`
- border / divider: `rgba(148,163,184,0.18)`
- accent: `#7aa2ff` (a touch lighter for AA on dark)
- positive: `#34d399`
- negative: `#f87171`

PnL colors are *not* mode-flipped except for shade — the meaning stays consistent.

## Layout intent

```
┌──────────────────────────────────────────────┐
│ eyebrow: ETF PORTFOLIO                       │
│ H1: Daily snapshot (light, not bolded slab)  │
│ subtitle: CHF 121'730.94 · 2026-06-03        │
├──────────────────────────────────────────────┤
│ ┌─ KPI card ──────────────────────────────┐  │
│ │ TOTAL VALUE                             │  │
│ │ CHF 121'730.94          (large)         │  │
│ │ Cash CHF 266.81 · Invested CHF 121'464  │  │
│ └─────────────────────────────────────────┘  │
│ ┌─ PnL card (subtle, not red slab) ───────┐  │
│ │ Unrealized P/L  -CHF 4.84   -0.0%       │  │
│ └─────────────────────────────────────────┘  │
│ Holdings table (hairline, right-aligned $)   │
│ 11 rows + total                              │
│ Footer: generated stamp · OpenClaw           │
└──────────────────────────────────────────────┘
```

Compared to today: gradient hero is replaced by a clean eyebrow + soft heading. The big navy KPI block becomes a single quiet card. The red P/L slab loses its slab — sign + tone color carries the meaning.

## Plan

### Phase A — capture today's baseline (no code changes)

1. Save current `runtime/dashboard-email-phase7-preview.html` and the latest sent email HTML as `runtime/baseline/dashboard-email-2026-06-03-baseline.html` for visual diff.
2. Capture screenshot evidence of light + dark in Apple Mail and Gmail.

### Phase B — design spec sign-off

1. Write `docs/email-dashboard-light-dark-spec.md` with:
   - the design tokens table
   - the light/dark CSS class hooks (`.t-*`)
   - the `@media (prefers-color-scheme: dark)` stylesheet
   - Outlook Windows fallback rules (no `prefers-color-scheme` support — treat as light forever)
   - a small reference HTML stub (no data) for visual approval.
2. Graham reviews the stub in Apple Mail + Gmail web in both modes.
3. Sign-off gate before code touches.

### Phase C — implementation (bounded refactor of `dashboardDigest.js`)

1. Introduce a tiny token map in `src/reporting/dashboardDigest.js` (constants for the colors and font sizes, no external dep).
2. Replace the gradient hero with the eyebrow + heading pattern.
3. Move all colors that need to flip to class-hook + `<style>` rule pair; keep inline color as the light fallback.
4. Add `<style>` block with:
   - `@media (prefers-color-scheme: dark) { ... }`
   - `[data-ogsc] ...` and `[data-ogsb] ...` Outlook overrides
5. Add the two `<meta>` color-scheme tags to `<head>`.
6. Keep table skeleton (`role="presentation"`) so Outlook Windows still renders fine.
7. Update / add tests:
   - existing `scripts/test-dashboard-digest-rendering.js` snapshot regenerates
   - `scripts/test-email-html-rendering.js` (or equivalent) re-checks invariants:
     - subject still rendered, no `undefined` interpolation
     - both `prefers-color-scheme` block and Outlook hooks present
     - no broken pad or color tokens
   - new tiny test asserting that signed PnL classes map to positive/negative tokens
8. Regenerate `runtime/dashboard-email-phase7-preview.html` (or the appropriate canonical preview) so the next `--dry-run` shows the new look.

### Phase D — visual verification

1. Run `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run` and inspect HTML.
2. Send a one-off `--frequency=daily` real send to a test recipient (Graham only) for Apple Mail + Gmail eye check in both modes.
3. Only after both modes look right, let the next scheduled send go out.

### Phase E — close-out

1. Update `docs/dashboard-v2.md` with a one-line "email digest is light/dark-adaptive as of YYYY-MM-DD".
2. Update `playbook.md` with a pointer to the spec doc and the test command.
3. Move this plan to `archive/phase-plans/` once shipped.

## Risks and mitigations

- **Outlook Windows ignores `prefers-color-scheme`.** Mitigation: light fallback is the inline default, must be visually correct on its own.
- **Gmail strips `<style>` blocks in some configurations.** Mitigation: dark mode is "nice to have" there; the inline light palette must always be readable.
- **`color-scheme: light dark` on iOS can over-aggressively invert mid-grays.** Mitigation: avoid pure-white text on dark; keep `#e6ecf5`-ish.
- **Snapshot tests will fail loudly.** That is intended — regenerate snapshots once the design is signed off.
- **Send-during-test risk.** The send script defaults to a real send (no `--help` honored). Use `--dry-run` for any local verification; only one real test send at the end of Phase D.

## Verification gates (per superpowers-openclaw)

- spec doc reviewed and signed off (Phase B)
- snapshot tests updated and passing (Phase C)
- dry-run preview opened in light + dark and approved (Phase D)
- one real test send to Graham approved (Phase D)
- only then production schedule resumes new look

## Out of scope / deferred

- Charts / sparklines in email (kept text-only for Phase 1).
- Theme toggle baked into the email body (not standard, not worth it).
- Per-recipient theme preference.
- Migrating to a dedicated email-templating dependency (mjml, react-email). Possible Phase 2 if the inline-style maintenance cost grows.
