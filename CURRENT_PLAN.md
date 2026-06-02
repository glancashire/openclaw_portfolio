# Current Plan

Date: 2026-06-02
Status: started

## Goal
Close the remaining plan/doc truth drift so repo-facing control files reflect the work that has already shipped.

## Visual roadmap

```text
Phase T1 plan/status truth closeout   [STARTED]   ██░░░░░░░░
```

---

## Phase T1 — Plan/status truth closeout
**Status:** STARTED

### Objectives
- restore `CURRENT_PLAN.md` as the real living plan/control file
- add the missing human-facing test governance entry point
- mark stale `active` / `planned` phase docs complete or superseded where the repo already satisfies them
- add regression coverage for the doc/control-file truth surfaces

### Risks / dependencies
- `CURRENT_PLAN.md` is parsed by `src/reporting/openPhasesCard.js`
- adding a new `scripts/test-*.js` file will require manifest regeneration
- the repo is dirty with generated artifacts, so staging must stay narrow

### Checklist
- [x] Audit current phase/doc truth against shipped repo state
- [ ] Add `docs/test-governance.md`
- [ ] Add regression coverage for governance/current-plan truth
- [ ] Regenerate manifest/domain-summary artifacts if needed
- [ ] Mark stale active/planned phase docs complete or superseded
- [ ] Run focused tests
- [ ] Run safe-lane verification
- [ ] Commit and push completed closeout

### Acceptance criteria
- `CURRENT_PLAN.md` is parseable and truthful again
- governance docs point to the real lane/policy/manifest sources
- stale active/planned phase docs are reconciled with shipped reality
- focused tests and the safe lane pass

## Backlog / external-only items
- IBKR quote posture remains operator-gated when subscriptions/data-farm state is degraded.
- Mailgun inbound remains external-service work, not an in-repo closeout item.
