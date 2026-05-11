# Phase 149 — Overview Broker Block Highlight

## Goal
Make overview surfaces (portfolio index / daily summary style artifacts) call out broker-blocked portfolios explicitly so broker-submit failures remain visible even when users are looking above the per-portfolio summary layer.

## Checklist
- [ ] Inspect overview builders and current highlight logic.
- [ ] Add broker-block visibility to portfolio index records.
- [ ] Prefer broker-blocked portfolios in daily-summary highlighting when appropriate.
- [ ] Add focused regression coverage for broker-block overview behavior.
- [ ] Re-run relevant overview/reporting tests.
- [ ] Commit and push once green.

## Verification
- New focused overview regression test(s).
- Existing broker-block artifact/reporting tests stay green.
- Existing multi-portfolio overview tests where relevant.

## Non-goals
- No new broker classifiers.
- No queue-priority redesign.
- No execution behavior changes.
