# Phase 168 — Beautiful HTML email system

## Goal
Upgrade the portfolio email surfaces so report emails and fill-confirmation emails are visually polished, consistently branded, and easy to read on desktop and mobile, while preserving the existing policy-gated delivery behavior.

## Scope
- Introduce a shared HTML email design system (layout helpers, cards, typography, status badges, tables, spacing, footer treatment).
- Refactor report summary emails to use the shared design system.
- Refactor trade/fill notification emails to use the shared design system.
- Preserve plain-text fallbacks and current policy/delivery behavior.
- Add focused tests that verify key HTML structure/content for both report and fill emails.
- Run at least one real report email surface after the redesign to confirm live delivery still works.

## Non-goals
- No provider changes.
- No outbound-recipient policy changes.
- No scheduling/cron changes in this phase.

## Design goals
- Strong visual hierarchy with clear title, subheading, and section cards.
- Readable tables and summary metrics.
- Health/pending status shown as styled badges or alerts.
- Mobile-friendly width and spacing.
- Neutral, professional tone suitable for financial reporting.

## Verification plan
- Add HTML-focused tests for report and trade email rendering.
- Re-run delivery/executor/email guardrail tests.
- Run one real summary email surface under live policy and confirm provider acceptance.
