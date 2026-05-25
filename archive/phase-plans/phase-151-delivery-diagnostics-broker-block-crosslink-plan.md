# Phase 151 — Delivery Diagnostics Broker-Block Crosslink

## Goal
Make delivery diagnostics and related operator-facing status surfaces mention active broker-blocked trade rows when they are relevant context, without overriding the existing rule that delivery backfill work takes precedence in delivery-specific recommendations.

## Checklist
- [ ] Inspect delivery diagnostics / delivery status rendering paths for the cleanest insertion point.
- [ ] Thread active broker-block context into the delivery diagnostic model when present.
- [ ] Render a compact broker-block context section in delivery-facing markdown/html surfaces.
- [ ] Preserve delivery-precedence ordering and existing recommendation behavior.
- [ ] Add focused regression coverage for delivery diagnostics with broker-block context.
- [ ] Re-run relevant delivery/reporting tests.
- [ ] Commit and push once green.

## Verification
- New focused delivery diagnostic regression test.
- Existing delivery backfill priority tests stay green.
- Existing broker-block reporting tests stay green.

## Non-goals
- No queue-priority redesign.
- No new broker failure classification.
- No execution-policy behavior changes.
