# Phase 148 — Summary And Recovery Broker Block Details

## Goal
Expose broker-derived trade block details directly in portfolio summary and recovery-checklist artifacts so operator truth includes the actual blocked rows, codes, reasons, and next actions without relying only on queue ordering.

## Checklist
- [ ] Inspect summary/recovery artifact builders for the best insertion points.
- [ ] Add broker-block details to summary JSON.
- [ ] Add broker-block details to recovery checklist output.
- [ ] Add focused regression coverage for summary/recovery artifact exposure.
- [ ] Re-run relevant reporting and broker-block tests.
- [ ] Commit and push once green.

## Verification
- New focused artifact test(s).
- Existing broker-block priority and summary-priority tests.
- Existing broker-reason classification coverage remains green.

## Non-goals
- No new broker classification rules.
- No execution-policy changes.
- No trade-log rewriting outside existing reconciliation behavior.
