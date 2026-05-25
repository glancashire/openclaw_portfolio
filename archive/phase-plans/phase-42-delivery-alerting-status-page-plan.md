# Phase 42 — Delivery and alerting status page plan

## Goal
Surface the delivery/alerting posture as an operator-facing page so the operator can see at a glance: what delivery mode is active, which channels are configured, whether external delivery is enabled, what failure alert targets exist, and what pending delivery actions remain.

## Why this next
The expanded specification gap list item 6 says: "Alerting / delivery posture is locally modeled, but not yet turned into a polished operator-facing communication workflow." The delivery policy infrastructure already exists in `src/reporting/deliveryPolicy.js`, but it is not surfaced as a readable operator artifact. This phase closes that gap.

## Scope checklist
- [ ] Build a delivery status collector that gathers per-portfolio delivery posture
- [ ] Generate a structured delivery-status JSON artifact
- [ ] Generate Markdown and HTML delivery-status views
- [ ] Thread delivery status into the cockpit navigation
- [ ] Add focused tests for delivery status collection and rendering
- [ ] Generate and inspect representative delivery-status artifacts

## Implementation notes
- Reuse `reportDeliveryStatus()` from `deliveryPolicy.js` for each portfolio.
- Aggregate into a repo-level delivery overview.
- Keep it read-only and side-effect-free.
- Show: mode, channels, external enabled, alert targets, pending actions, readiness per portfolio.

## Verification
- [ ] test delivery status collection helpers
- [ ] test generated JSON/Markdown/HTML artifacts
- [ ] test cockpit navigation includes delivery status link
- [ ] inspect representative output

## Exit criteria
Phase 42 is complete when operators can open a delivery-status page and understand the current alerting/delivery posture across portfolios without reading config files directly.
