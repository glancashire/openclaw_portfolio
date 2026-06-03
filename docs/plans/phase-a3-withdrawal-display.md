# Phase A3 — Withdrawal display in digest hero

Date: 2026-06-03
Owner: bb8 / Graham
Status: ACTIVE
Source: `CURRENT_PLAN.md` Phase A — withdrawal display

## Objective

When the deposits ledger contains a withdrawal, the digest hero card
should explicitly surface "Cumulative deposits / withdrawals / net"
rather than just showing "Net deposited" — so the operator-visible
math stays transparent when capital flows in both directions.

## Current behavior

The digest currently shows only "Net deposited" in the hero. This is
fine when withdrawals = 0 (today's case) but loses information when
they're non-zero.

## Implementation checklist

- [ ] In `src/reporting/reportEmail.js#buildReportEmailHtml`, when the
      ledger has any withdrawal entry, change the hero "Net deposited"
      tile from a single value to a small stack:
        Net deposited: <X>  (Deposits <D> · Withdrawals <W>)
- [ ] Apply the same change to `buildReportEmailText`.
- [ ] Apply equivalent changes to `dashboardDigest.js#renderValueHeadlineCard`.
- [ ] Add regression test `scripts/test-deposits-withdrawal-display.js`
      using a temp portfolio fixture with one deposit + one withdrawal.

## Acceptance criteria

- HTML hero, when ledger has withdrawals, shows "Net deposited X (Deposits D · Withdrawals W)".
- Plain-text hero shows two lines: "Net deposited: X" + "(Deposits D, Withdrawals W)".
- ETF email is unchanged (no withdrawals exist in real data).
- safe lane stays 240/0 (+1 new test).
