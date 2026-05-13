# Phase 153 — Delivery JSON and Cockpit Broker-Block Context

## Goal
Carry the broker-block context already visible in delivery diagnostics and delivery markdown into the generated delivery-status JSON surface and the operator cockpit page so every delivery-facing surface tells the same truth.

## Checklist
- [x] Inspect current delivery-status JSON structure and cockpit rendering for insertion points.
- [x] Preserve the existing delivery-specific recommended next action precedence.
- [x] Ensure delivery-status JSON retains `deliveryPosture.brokerBlockContext` for each portfolio.
- [x] Add a compact broker-block hint/section to the cockpit page when broker blocks exist.
- [x] Add focused regression coverage for generated delivery overview JSON and cockpit HTML.
- [x] Re-run relevant delivery/overview/reporting tests.
- [x] Commit and push once green.

## Verification
- Existing delivery diagnostic context test stays green.
- Existing delivery markdown broker-block context test stays green.
- New cockpit/delivery overview regression test passes.

## Non-goals
- No change to broker-block prioritization rules.
- No change to delivery readiness recommendation ordering.
- No new execution behavior.
