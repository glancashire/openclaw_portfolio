# Phase 198 — Round Driver Documentation + Runbook Page

## Objective
Document the autonomous basket execution flow as an operator runbook. After all the code work (Phases 184–197), the operator's actual interaction surface is now:

1. Assistant runs `node scripts/propose-basket.js --portfolio=etf` to generate a fresh proposal.
2. Operator types `approve`.
3. Assistant runs `node scripts/execute-approved-basket-end-to-end.js` (no args).
4. If a leg cancels, assistant emits a reproposal automatically and tells the operator.
5. Operator types `approve` again.
6. Assistant runs `node scripts/approve-and-execute-reproposal.js --parent=<id>`.

Step 4–6 may repeat; the operator never edits code or JSON files.

This runbook page formalises that contract for both operator and assistant.

## Risks / dependencies
- Documentation drift between code and runbook. Mitigation: the runbook references file paths and CLI invocations directly; tests already pin these.
- TOOLS.md is the canonical local-tools reference; this runbook should live alongside `playbook.md` at workspace root.

## Actionable checklist
- [ ] Write `docs/basket-execution-runbook.md` covering:
  - Prerequisites (IB Gateway authenticated, live arm window).
  - Four-stage workflow with exact commands.
  - Failure modes (cancellation, broker disconnect, stale proposal).
  - Operator's contract: one `approve` per round; never edit code.
- [ ] Add a brief pointer in `playbook.md` to the new runbook.
- [ ] No new tests required; this is documentation only.

## Acceptance criteria
- `docs/basket-execution-runbook.md` exists and accurately describes the Phase 184–197 workflow.
- `playbook.md` references it.
- All existing tests still pass.
