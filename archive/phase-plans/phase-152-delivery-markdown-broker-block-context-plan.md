# Phase 152 — Delivery Markdown Broker-Block Context

## Goal
Render the newly available broker-block context in delivery-facing markdown/html status surfaces so operators can see unresolved broker execution blocks while still keeping the delivery-specific next action unchanged and primary.

## Checklist
- [ ] Inspect delivery markdown/html renderers for the cleanest insertion point.
- [ ] Add a compact broker-block context section sourced from `deliveryPosture.brokerBlockContext`.
- [ ] Keep the existing delivery next-action wording and precedence unchanged.
- [ ] Add focused regression coverage for delivery markdown rendering with broker-block context.
- [ ] Re-run relevant delivery/reporting tests.
- [ ] Commit and push once green.

## Verification
- New focused delivery renderer regression test.
- Existing delivery diagnostic context test stays green.
- Existing delivery backfill priority tests stay green.

## Non-goals
- No recommendation-priority changes.
- No new broker classification logic.
- No execution workflow behavior changes.
