# Phase 41 — Operator cockpit landing page plan

## Goal
Create a single unified operator landing page (HTML) that links to all generated operator surfaces in one place, providing a cohesive cockpit experience instead of requiring the operator to know which individual artifact to open.

## Why this next
The expanded specification (section 15, item 5) calls for a "multi-portfolio overview and operator cockpit." The individual surfaces now exist (daily summary, approvals queue, recovery checklist, report history, portfolio summaries), but there is no single entry point that ties them together. This phase creates that entry point.

## Scope checklist
- [ ] Create a cockpit landing page generator that produces a single HTML page
- [ ] Include navigation links to all generated operator surfaces
- [ ] Include a compact status summary (health, approvals, drift, broker) at the top
- [ ] Include quick-reference links to per-portfolio summary pages
- [ ] Write the cockpit page to `runtime/overview/index.html`
- [ ] Thread cockpit generation into the overview artifact pipeline
- [ ] Add focused verification for cockpit content and links
- [ ] Generate and inspect the cockpit page

## Implementation notes
- Use the improved stylesheet from Phase 40.
- Keep it a static HTML page with relative links to sibling artifacts.
- Include a timestamp and compact health badge area at the top.
- No JavaScript required; pure HTML/CSS navigation.

## Verification
- [ ] test that cockpit HTML is generated and contains expected navigation links
- [ ] test that status summary section is present
- [ ] inspect representative output

## Exit criteria
Phase 41 is complete when `runtime/overview/index.html` exists as a unified operator cockpit landing page linking to all generated surfaces, and tests pass.
