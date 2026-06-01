# Phase W8 — Approval lifecycle UX hardening (plan)

- **Wave:** W8 of `tasks/wave-plan-2026-05-27-closeout.md`
- **Roadmap item:** Post-MVP #2 — approval lifecycle UX
- **Author:** bb8 (subagent, autonomous)
- **Date:** 2026-05-27

## Goal

Make the approvals queue self-explanatory for the operator by grouping queue
items into clear lifecycle categories (actionable, stale, superseded) and
attaching an operator-facing `explanation` to every item that tells the
operator *why* a row is in that group and what they should do about it.

The dedicated stale-approval refresh command (`scripts/trade.js
refresh-stale-approvals`) already exists; this wave focuses on the queue
surface and operator transparency only.

## Background

Today `buildApprovalsQueue()` in `src/reporting/summaryArtifacts.js` flattens
several heterogeneous inputs into a single rank-ordered list:

1. Tripped circuit breakers (`circuitBreakerSurface`)
2. **Latest** pending reproposals per parent (`listLatestPendingReproposals`)
   — older versions for the same parent are silently dropped, so the operator
   has no way to see they once existed.
3. Approved baskets ready for execution (`basket_approved`)
4. Operator-queue items of kind/queueType `approval` (proposed rows etc.)

Two things are missing:

- **Stale approvals** (rows with canonical state `stale_needs_reapproval`)
  are surfaced as a *count* on the dashboard but do not appear as individual
  queue items. The operator can only discover them by running
  `refresh-stale-approvals`.
- **Superseded reproposals** are hidden. When a row has been regenerated, the
  legacy older version is dropped from the queue entirely. There is no
  breadcrumb such as "v1 was replaced by v2 on YYYY-MM-DD".

## Design

### Item taxonomy (`group` field, additive)

Every queue item gets a new top-level `group` field:

| group        | meaning                                                              |
|--------------|----------------------------------------------------------------------|
| `actionable` | Fresh proposal / approved basket / latest reproposal ready for action |
| `stale`      | Row was previously approved but approval window has aged out          |
| `superseded` | Row was replaced by a newer proposal; only kept as context            |

For circuit breakers we keep them at the top, with group `actionable` since
the operator must still clear them.

### `explanation` field semantics

`explanation` already exists for most paths but is sometimes just a copy of
`summary`. We make it group-aware:

- **actionable** — `"Fresh proposal within approval window."` (or
  reproposal-specific wording.)
- **stale** — `"Approved Xh ago; refresh approval before live submission."`
  (uses real `approvalAgeHours`)
- **superseded** — `"Superseded by v{n} created {date}; approve the newer row
  instead."` for reproposals.

### Where superseded items come from

`listPendingReproposals()` already returns every version. We:

1. Call `listPendingReproposals` (not just `listLatestPendingReproposals`).
2. Group by `parentApprovalId`, identify the highest version → actionable.
3. For each older version → produce a `superseded` queue item that points
   forward to the newer version (parent + version + path).

### Where stale items come from

`summary.approvals.staleApprovals` (already populated by
`buildPortfolioSummaryModel`). We append one queue item per stale row, group
`stale`, severity `high`, urgency `high`, with explanation derived from
`approvalAgeHours` + reason from `staleApprovalInventory`.

### Output shape (additive, backward-compatible)

```jsonc
{
  "schemaVersion": "1.1",          // bumped from 1.0
  "generatedAt": "...",
  "itemCount": N,                  // total across all groups (unchanged)
  "items": [ ... ],                // same flat array, every item gains `group` + `explanation`
  "groups": {                      // NEW summary
    "actionable": { "count": A, "items": [refs by rank] },
    "stale":      { "count": S, "items": [refs by rank] },
    "superseded": { "count": X, "items": [refs by rank] }
  }
}
```

Consumers that already read `queue.items` keep working — items are still
present, just enriched. Consumers that read `queue.itemCount` keep working —
it still equals `items.length`.

### Markdown renderer

`renderApprovalsQueueMarkdown` is updated to emit three `##` sub-sections
under "Approval Review Queue":

```
## Approval Review Queue

### Actionable now
### Approval 1: etf
- ...

### Stale / needs refresh
### Approval N: etf
- ...

### Regenerated (superseded)
### Approval M: etf
- ...
```

Empty groups render `_(none)_`. The existing empty-queue placeholder is
preserved when `itemCount === 0`.

## Implementation steps

1. **Plan committed** (this file).
2. `src/reporting/summaryArtifacts.js`:
   - In `buildApprovalsQueue()`:
     - Use `listPendingReproposals` and split into latest-per-parent vs older.
     - Append stale-approval items from `summary.approvals.staleApprovals`.
     - Annotate every item with `group` and a group-specific `explanation`.
     - Sort actionable first, then stale, then superseded; within each group
       keep existing urgency/portfolio/summary sort.
     - Build the `groups` summary object.
   - `renderApprovalsQueueMarkdown`: emit grouped headings; preserve legacy
     bullets, attention bullets, deployment bullets.
3. New test `scripts/test-approval-queue-grouping.js`:
   - Fresh proposals → group `actionable`.
   - Stale approvals → group `stale` with non-empty explanation referencing
     hours.
   - Two reproposal versions for same parent → newer is actionable, older is
     superseded with explanation pointing to the newer version.
   - Every item has non-empty `explanation`.
   - Markdown renders headings: "Actionable now", "Stale / needs refresh",
     "Regenerated (superseded)".
   - JSON output includes `groups` summary with correct counts.
4. Wire new test into `verifyRepoChecks.js`.
5. Run `npm test` until green; iterate as needed.
6. Commit + push.
7. Update wave plan progress.

## Backward-compatibility checks

- `scripts/test-approvals-queue-basket-first.js` — still expects two items
  with the second being `pending_user_approval`. Our changes are additive; we
  preserve order within actionable group, so this passes.
- `scripts/test-approvals-queue-markdown-annotations.js` — still expects
  attention/deployment bullets and empty-queue placeholder. We keep these.
- `scripts/test-stale-approval-refresh-command.js` — does not touch
  `buildApprovalsQueue`; unaffected.

## Out of scope

- Changing the trade-row schema, the reproposal storage layout, or the
  `refresh-stale-approvals` CLI.
- Auto-promoting / auto-rejecting superseded rows.
- HTML cockpit rendering changes (markdown → HTML pipeline already converts).
