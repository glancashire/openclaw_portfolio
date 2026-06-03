# Email dashboard — light/dark spec

Date: 2026-06-03
Status: ACTIVE
Owner: bb8 / Graham
Companion plan: `docs/plans/dashboard-email-themeforest-redesign-plan.md`

## What this covers

The visual layer of the digest/dashboard HTML email rendered by `src/reporting/emailHtml.js` and consumed by `src/reporting/dashboardDigest.js` and the investor report templates that share `page()` / `card()` / `dataTable()` etc.

This spec is the source of truth for tokens, class hooks, and the dark-mode strategy used in those emails.

## Tokens

### Light (inline defaults)

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#f7f8fb` | page background |
| `surface` | `#ffffff` | card surface |
| `surfaceAlt` | `#f9fafc` | subtle banded surface (footer, table header) |
| `text` | `#1a1a2e` | primary text |
| `muted` | `#6b7280` | secondary text |
| `subtle` | `#9ca3af` | tertiary text, eyebrow |
| `line` | `#e5e7eb` | hairline divider, card border |
| `lineStrong` | `#d1d5db` | header bottom rule, table header rule |
| `accent` | `#2563eb` | accent fills, links |
| `positive` | `#15803d` | profit values |
| `positiveBg` | `#ecfdf5` | success-tone surface |
| `negative` | `#b91c1c` | loss values |
| `negativeBg` | `#fef2f2` | danger-tone surface |
| `warn` | `#9a3412` | warn fg |
| `warnBg` | `#fff7ed` | warn surface |
| `info` | `#1d4ed8` | info fg |
| `infoBg` | `#eff6ff` | info surface |

### Dark (via `@media (prefers-color-scheme: dark)`)

| Token | Value |
| --- | --- |
| `bg` | `#0b1220` |
| `surface` | `#0f1623` |
| `surfaceAlt` | `#131c2e` |
| `text` | `#e6ecf5` |
| `muted` | `#9aa6b8` |
| `subtle` | `#6b7a8d` |
| `line` | `rgba(148,163,184,0.18)` |
| `lineStrong` | `rgba(148,163,184,0.28)` |
| `accent` | `#7aa2ff` |
| `positive` | `#34d399` |
| `positiveBg` | `rgba(52,211,153,0.10)` |
| `negative` | `#f87171` |
| `negativeBg` | `rgba(248,113,113,0.10)` |
| `warn` | `#fbbf24` |
| `warnBg` | `rgba(251,191,36,0.10)` |
| `info` | `#93c5fd` |
| `infoBg` | `rgba(147,197,253,0.08)` |

PnL colors keep their meaning across modes; only shade adjusts for AA contrast.

## CSS class hooks

The renderer always inlines the **light** palette as a fallback for clients that strip `<style>` blocks (Outlook Windows, some Gmail configurations). Class hooks are added in parallel so a `<style>` block can flip them in dark mode.

| Hook | Purpose |
| --- | --- |
| `.t-page` | body background |
| `.t-shell` | outer card frame |
| `.t-surface` | inner card surface |
| `.t-surface-alt` | subtle band (table header, footer) |
| `.t-text` | primary text |
| `.t-muted` | secondary text |
| `.t-subtle` | tertiary text |
| `.t-line` | hairline border (border or border-color override) |
| `.t-line-strong` | stronger divider |
| `.t-accent` | accent color |
| `.t-pos` | positive PnL color |
| `.t-neg` | negative PnL color |
| `.t-card` | card container (combines surface + border) |
| `.t-badge` | badge base |
| `.t-badge-info`, `.t-badge-warn`, `.t-badge-success`, `.t-badge-danger`, `.t-badge-neutral` | badge tones |

## Dark-mode strategy (email-safe)

Three layers of compatibility:

1. **Inline light defaults.** Every element keeps its inline color/background as the light palette. If the client strips `<style>` we still get a clean light email.
2. **`<style>` block with `@media (prefers-color-scheme: dark)`.** Targets class hooks and overrides `background-color`, `color`, `border-color`. Supported in Apple Mail, iOS Mail (16+), Outlook macOS, Spark, Hey, Thunderbird, modern Gmail iOS partial.
3. **Outlook.com / Outlook 365 web hooks.** `[data-ogsc]` and `[data-ogsb]` selectors mirror the dark-mode rules so Outlook's scheme-invert feature uses our palette instead of its automatic invert.

Plus head metadata:

```html
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
```

## Layout intent

```
┌────────────────────────────────────────────┐
│ eyebrow (subtle, uppercase): OPENCLAW…     │
│ H1 (text, weight 700): Daily snapshot      │
│ subtitle (muted): CHF 121'730.94 · 2026-…  │
│ thin hairline divider                      │
├────────────────────────────────────────────┤
│ Card                                       │
│ Card                                       │
│ ...                                        │
├────────────────────────────────────────────┤
│ footer (subtle, centered): OpenClaw …      │
└────────────────────────────────────────────┘
```

No more navy gradient. The hero becomes an in-document section (same `surface` color as cards), separated from cards only by spacing and a thin hairline.

## What does NOT change

- Function signatures and module exports of `src/reporting/emailHtml.js` stay identical (`page`, `card`, `badge`, `metricGrid`, `kvTable`, `dataTable`, `bulletList`, `formatCurrency`, `formatPercent`, `escapeHtml`, `BRAND`).
- The `BRAND` export keeps the same shape but its values are now the *light* palette so callers that read `BRAND.success` or `BRAND.danger` still get sensible colors.
- `src/reporting/dashboardDigest.js` and other consumers remain untouched.
- Subject building, recipient resolution, and the send pipeline are out of scope.

## Verification

- All existing tests under `scripts/test-*.js` continue to pass.
- New assertions in `scripts/test-email-html-rendering.js` cover:
  - presence of `<meta name="color-scheme" ...>`
  - presence of `<style>` with `prefers-color-scheme: dark`
  - presence of `[data-ogsc]` and `[data-ogsb]` selectors
  - inline light fallback colors are still emitted
  - `BRAND` export still has expected keys
  - the gradient `linear-gradient(...)` in the hero header is gone
- Dry-run preview at `runtime/dashboard-email-phase7-preview.html` regenerated via `scripts/regenerate-dashboard-email-preview.js` (no real send).
