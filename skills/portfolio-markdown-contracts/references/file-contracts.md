# File Contracts

## `portfolio.md`
Include:
- Status
- Strategy Summary
- Investor Profile
- Allocation Targets
- Geographic Targets
- Industry / Sector Constraints
- Approved Instruments
- Excluded Instruments
- Rebalancing Policy
- Market Entry Policy
- Risk Limits
- Broker Access
- Automation Permissions
- Notes / Open Questions

Default first live portfolio:
- name: ETF
- status: draft
- base currency: CHF
- broker: ig
- asset scope: ETF only
- execution mode: require_confirmation

## `holdings.md`
Purpose: current effective holdings and valuation.

Must include:
- Last Sync
- Current Holdings table
- Cash table
- Data Quality section

Update triggers:
- daily
- after executed trade
- on explicit request
- before rebalance analysis

## `trades.md`
Purpose: append-only trade log.

Allowed statuses:
- proposed
- approved
- rejected
- submitted
- partially_filled
- filled
- cancelled
- failed
- simulated

Each proposal should preserve rationale fields in the Reason/Approval columns or linked narrative.

## `history.md`
Purpose: daily valuation snapshots.

Keep one row per snapshot, typically start/end of day.

## `dashboard.md`
Must include:
- Summary
- Allocation vs Target
- Instrument Overview
- Recommended Actions
- Risk Warnings
- Recent Trades

## Reports
Use this filename pattern:
- `portfolio_report_<portfolio_name>_<period>_<YYYYMMDD>.md`
- `portfolio_report_<portfolio_name>_<period>_<YYYYMMDD>.pdf`

Required report sections:
- Period
- Executive Summary
- Performance
- Allocation Review
- Trades During Period
- Strategy Compliance
- What Worked
- What Did Not Work
- Recommended Changes
- Next Actions

## `config/schedules.md`
Must include default Daily / Weekly / Monthly / Quarterly schedule sections from the spec.
