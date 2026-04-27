# OpenClaw Portfolio Manager — Build Specification

## 1. Purpose

Create a new OpenClaw instance that manages investment portfolios across broker/provider platforms via APIs.

The system should help enforce a defined portfolio strategy with disciplined allocation, monitoring, gradual deployment of capital, rebalancing, audit reporting, and clear human approval gates.

The first supported broker is **IG / IG Bank / ig.com**. The architecture must allow additional brokers later, such as **Swissquote**.

The first supported assets are **widely traded ETFs only**, denominated or tracked in **CHF** where possible. No options, leverage products, CFDs, derivatives, crypto, structured products, or short selling in the first version.

---

## 2. Core Principles

1. **Modular architecture**
 - Broker integrations must be isolated in broker adapters.
 - Portfolio strategy logic must be separate from execution logic.
 - Reporting must be separate from portfolio management.
 - File storage must be simple, transparent, and inspectable.

2. **Structured Markdown as the control layer**
 - Each portfolio is represented by a folder.
 - Each portfolio has a small set of structured Markdown files.
 - Markdown files act as both human-readable configuration and operational logs.

3. **One broker per portfolio**
 - A portfolio may only be linked to one broker account.
 - Multiple portfolios may use the same broker type, but each portfolio has its own folder and configuration.

4. **Human approval before material actions**
 - The system may analyse, suggest, prepare, and simulate trades automatically.
 - The system must not execute new buy/sell trades unless the portfolio settings explicitly allow automated execution.
 - By default, trade execution requires user confirmation.

5. **Capital preservation and auditability**
 - Every action must be logged.
 - Every trade decision must be explainable.
 - Every broker operation must have a dry-run mode.
 - Every generated order must include rationale, expected allocation impact, and risk notes.

---

## 3. Initial Scope

### Supported in MVP

- Multiple portfolios.
- One broker account per portfolio.
- IG / ig.com broker adapter.
- ETF-only portfolios.
- CHF base currency.
- Portfolio creation workflow.
- Strategy definition.
- ETF suggestion workflow.
- Manual approval of proposed ETF universe.
- Holdings synchronisation from broker.
- Portfolio valuation.
- Rebalancing analysis.
- Trade proposal generation.
- Trade logging.
- Daily holdings/value history.
- Dashboard generation.
- Weekly, monthly, and quarterly audit reports.
- PDF report generation.

### Explicitly out of scope for MVP

- Options.
- CFDs.
- Margin trading.
- Short selling.
- Crypto.
- FX speculation.
- Multi-currency optimisation.
- Tax optimisation.
- Automatic tax reporting.
- Multi-broker portfolio aggregation.
- Intraday high-frequency trading.
- Prediction-heavy trading.
- Market timing based on opaque signals.
- Trading without clear strategy alignment.

---

## 4. Repository / Folder Structure

```text
portfolio/
 _template/
 portfolio.md
 holdings.md
 trades.md
 history.md
 dashboard.md
 reports/
 README.md

 etf/
 portfolio.md
 holdings.md
 trades.md
 history.md
 dashboard.md
 reports/
 weekly/
 monthly/
 quarterly/

brokers/
 ig/
 adapter.md
 auth.md
 instruments.md
 orders.md
 swissquote/
 adapter.md

runtime/
 logs/
 cache/
 snapshots/
 reports/

config/
 openclaw.md
 schedules.md
 risk_limits.md
```

---

## 5. Portfolio Folder Contract

Each portfolio folder must contain the following files.

---

## 6. `portfolio.md`

Purpose: define the portfolio strategy, broker link, execution rules, asset universe, constraints, and rebalancing policy.

### Required sections

```markdown
# Portfolio: <portfolio_name>

## Status
- Status: draft | active | paused | archived
- Created: YYYY-MM-DD
- Last reviewed: YYYY-MM-DD
- Base currency: CHF
- Broker: ig
- Broker account reference: <account_alias_or_safe_identifier>
- Execution mode: propose_only | require_confirmation | auto_trade_limited | auto_trade_full
- Asset scope: ETF only

## Strategy Summary
Short human-readable description of the portfolio strategy.

## Investor Profile
- Risk level: low | medium | high
- Investment horizon: <years>
- Liquidity needs: low | medium | high
- Maximum acceptable drawdown: <%>
- Income requirement: none | low | medium | high
- ESG preference: none | prefer | required
- Currency preference: CHF-first

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 60 | 50 | 70 | Broad developed-market ETF |
| Swiss equities | 20 | 10 | 30 | CHF exposure |
| Bonds / cash-like | 20 | 10 | 30 | CHF bonds or money-market ETF |

## Geographic Targets
| Region | Target % | Min % | Max % |
|---|---:|---:|---:|
| Switzerland | 20 | 10 | 30 |
| Developed World ex-CH | 60 | 45 | 75 |
| Emerging Markets | 0 | 0 | 10 |

## Industry / Sector Constraints
| Sector | Min % | Max % | Notes |
|---|---:|---:|---|
| Technology | 0 | 30 | Avoid excessive concentration |
| Financials | 0 | 25 | Avoid excessive concentration |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|

## Rebalancing Policy
- Check frequency: daily
- Rebalance frequency: monthly or when thresholds are breached
- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%
- Minimum trade size: CHF <amount>
- Avoid unnecessary trades: true
- Prefer using new cash before selling: true

## Market Entry Policy
- Initial deployment mode: staged
- Deployment period: <e.g. 5-20 trading days>
- Max daily deployment: <% of available cash>
- Avoid buying after extreme daily price moves: true
- Use limit orders where supported: true
- Require confirmation before first live trade: true

## Risk Limits
- Max single ETF allocation: <%>
- Max single issuer allocation: <%>
- Max equity allocation: <%>
- Max bond duration: <years or n/a>
- Max cash drag after full deployment: <%>
- Stop trading if portfolio value drops by: <% over <period>>
- Stop trading if broker/API errors occur: true

## Broker Access
- Broker adapter: ig
- Credentials source: environment variables or secret store only
- Never store API keys in Markdown: true
- Account matching rule: <account alias / account id mapping>
- Read-only mode available: true
- Dry-run mode available: true

## Automation Permissions
- Sync holdings automatically: yes
- Generate trade proposals automatically: yes
- Execute trades automatically: no by default
- Send reports automatically: yes
- Require user approval for new instruments: yes
- Require user approval for first purchase: yes
- Require user approval for sales: yes unless auto_trade_limited is enabled

## Notes / Open Questions
- <questions to resolve before activation>
```

---

## 7. `holdings.md`

Purpose: store the effective current holdings and valuation.

This file must be updated:
- daily,
- after every executed trade,
- on explicit user request,
- before any rebalance analysis.

### Format

```markdown
# Holdings: <portfolio_name>

## Last Sync
- Date/time: YYYY-MM-DD HH:mm:ss
- Source: broker_api | manual | simulated
- Broker: ig
- Base currency: CHF
- Total value CHF: <amount>
- Cash CHF: <amount>
- Invested value CHF: <amount>

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|

## Cash
| Currency | Amount | FX rate to CHF | Value CHF |
|---|---:|---:|---:|

## Data Quality
- All holdings matched to approved instruments: yes/no
- Unmatched holdings: none/list
- Pricing source: broker_api | market_data_api | cached
- Warnings:
 - <warning>
```

---

## 8. `trades.md`

Purpose: append-only log of all proposed, approved, rejected, cancelled, and executed trades.

### Format

```markdown
# Trades: <portfolio_name>

## Trade Log

| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|
```

### Allowed statuses

- proposed
- approved
- rejected
- submitted
- partially_filled
- filled
- cancelled
- failed
- simulated

### Required trade rationale

Every proposed trade must include:
- strategy reason,
- allocation before,
- allocation after,
- drift corrected,
- risk note,
- expected cost,
- whether it uses cash or requires selling.

---

## 9. `history.md`

Purpose: daily portfolio valuation history.

This file should contain one row per portfolio snapshot, usually at the start and end of each trading day.

### Format

```markdown
# History: <portfolio_name>

## Daily Valuation History

| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| YYYY-MM-DD | start_of_day | | | | | | |
| YYYY-MM-DD | end_of_day | | | | | | |
```

---

## 10. `dashboard.md`

Purpose: give a clear human-readable overview of the portfolio state.

Must be regenerated:
- after holdings sync,
- after trade execution,
- after rebalance analysis,
- before report generation.

### Required sections

```markdown
# Dashboard: <portfolio_name>

## Summary
- Total value: CHF <amount>
- Cash: CHF <amount>
- Invested: CHF <amount>
- Number of holdings: <number>
- Strategy status: on_track | minor_drift | rebalance_needed | blocked
- Last sync: YYYY-MM-DD HH:mm:ss
- Last rebalance check: YYYY-MM-DD HH:mm:ss

## Allocation vs Target
| Asset class | Current % | Target % | Drift % | Status |
|---|---:|---:|---:|---|

## Instrument Overview
| Ticker / ISIN | Name | Value CHF | Current % | Target % | Drift % | Action |
|---|---|---:|---:|---:|---:|---|

## Recommended Actions
1. <action>
2. <action>

## Risk Warnings
- <warning>

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
```

---

## 11. Broker Adapter Interface

Each broker must implement the same interface.

### Required broker adapter functions

```text
authenticate()
list_accounts()
select_account(account_reference)
get_cash_balances()
get_holdings()
get_instrument_details(identifier)
search_instruments(query)
get_latest_price(identifier)
get_order_quote(order)
place_order(order, dry_run=true)
get_order_status(order_id)
cancel_order(order_id)
normalise_broker_holding(raw_holding)
normalise_broker_order(raw_order)
```

### Broker adapter rules

- Never expose raw credentials in logs.
- Always support read-only mode.
- Always support dry-run mode.
- Broker-specific fields must be normalised before they reach portfolio logic.
- All broker calls must be logged with timestamp, method, status, and safe summary.
- Failed broker calls must not trigger repeated trade attempts without human review.

---

## 12. IG Broker Adapter — MVP Requirements

The first broker adapter should support IG / ig.com.
You can find the documentation here [IG Labs | Trading APIs](https://labs.ig.com/)
### Required capabilities

- Authenticate using secure credential storage.
- List available IG accounts.
- Select the correct investment account.
- Read cash balance.
- Read current holdings/positions.
- Search for ETF instruments.
- Fetch ETF prices.
- Prepare ETF buy/sell orders.
- Submit orders only if execution mode permits it.
- Track order status.
- Log all broker interactions safely.

### Important constraint

The adapter must first be built and tested in **read-only + dry-run mode**. Live trading must remain disabled until:
1. account matching works,
2. holdings sync is reliable,
3. trade proposal generation is correct,
4. order quote generation is correct,
5. the user explicitly enables live execution.

---

## 13. Portfolio Creation Workflow

When the user asks to create a portfolio, OpenClaw should walk through the required information until the strategy is sufficiently clear.

### Minimum required questions

1. Portfolio name.
2. Broker.
3. Broker account alias/reference.
4. Base currency.
5. Initial capital / expected portfolio size.
6. Investment horizon.
7. Risk level.
8. Maximum acceptable drawdown.
9. Target asset classes.
10. Geographic preferences.
11. Sector exclusions or preferences.
12. ESG preference.
13. ETF issuer preferences or exclusions.
14. Rebalancing tolerance.
15. Whether automated execution is allowed.
16. Whether staged market entry is desired.
17. Any excluded instruments.
18. Any instruments already held.

### Output of this workflow

- Create `portfolio/<name>/portfolio.md`.
- Create empty but valid `holdings.md`.
- Create empty but valid `trades.md`.
- Create empty but valid `history.md`.
- Create initial `dashboard.md`.
- Mark portfolio status as `draft`.
- List open questions before activation.

---

## 14. Strategy and ETF Selection Workflow

After the portfolio strategy is defined:

1. Parse `portfolio.md`.
2. Identify required asset classes and target allocation.
3. Search for suitable ETFs.
4. Filter by:
 - asset class,
 - geography,
 - currency,
 - exchange availability,
 - liquidity,
 - total expense ratio,
 - fund size,
 - replication method,
 - domicile,
 - distribution vs accumulation,
 - broker availability,
 - trading spread where available.
5. Suggest a concise ETF shortlist.
6. Explain why each ETF is suitable.
7. Highlight trade-offs.
8. Ask for approval before adding instruments to `Approved Instruments`.

### ETF suggestion output

```markdown
## Suggested Instruments

| Rank | Ticker / ISIN | Name | Asset class | Reason | Key risks | Suggested target % |
|---:|---|---|---|---|---|---:|
```

---

## 15. Market Entry Workflow

After instruments are approved:

1. Sync broker account.
2. Confirm cash available.
3. Generate staged purchase plan.
4. Watch market over the configured deployment period.
5. Prefer disciplined staged entry over aggressive timing.
6. Use limit orders where supported.
7. Avoid over-optimising for perfect entry prices.
8. Start with small purchases if enabled.
9. Log all proposals and trades.
10. Update holdings, history, and dashboard after each execution.

### Default market entry policy

- Use staged entry over 5-20 trading days.
- Do not deploy more than the configured daily maximum.
- Prefer target allocation discipline over prediction.
- Do not trade if price data is stale.
- Do not trade if broker API status is uncertain.
- Do not trade if the portfolio has unresolved strategy questions.

---

## 16. Rebalancing Workflow

Run daily checks, but only recommend or execute rebalancing when thresholds are breached.

### Rebalancing logic

1. Sync holdings.
2. Calculate current allocations.
3. Compare with target allocation.
4. Identify drift.
5. Prefer using available cash before selling.
6. Avoid small trades below minimum trade size.
7. Avoid excessive turnover.
8. Generate trade proposals.
9. Require approval unless automated execution is enabled.
10. Execute, log, sync, and update dashboard.

### Rebalancing trigger

A rebalance is needed if:
- any asset class exceeds min/max range,
- any instrument exceeds max allocation,
- absolute drift exceeds configured threshold,
- risk limits are breached,
- cash drag exceeds configured threshold after full deployment.

---

## 17. Reporting

Generate regular reports as Markdown and PDF.

### Report schedules

- Weekly report.
- Monthly report.
- Quarterly report.

### Report locations

```text
portfolio/<name>/reports/weekly/
portfolio/<name>/reports/monthly/
portfolio/<name>/reports/quarterly/
```

### Report filename format

```text
portfolio_report_<portfolio_name>_<period>_<YYYYMMDD>.md
portfolio_report_<portfolio_name>_<period>_<YYYYMMDD>.pdf
```

### Required report sections

```markdown
# Portfolio Report: <portfolio_name>

## Period
- Report type: weekly | monthly | quarterly
- Period start:
- Period end:
- Generated:

## Executive Summary
Short summary of performance, allocation, trades, risks, and recommended changes.

## Performance
| Metric | Value |
|---|---:|
| Start value CHF | |
| End value CHF | |
| Change CHF | |
| Change % | |

## Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|

## Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|

## Strategy Compliance
- On strategy: yes/no
- Rebalance needed: yes/no
- Risk limits breached: yes/no

## What Worked
- <point>

## What Did Not Work
- <point>

## Recommended Changes
- <recommendation>

## Next Actions
- <action>
```

---

## 18. Scheduling

Create configurable schedules in `config/schedules.md`.

### Default schedules

```markdown
# Schedules

## Daily
- Sync holdings: start of trading day
- Sync holdings: end of trading day
- Update history
- Regenerate dashboard
- Check rebalance drift

## Weekly
- Generate weekly report
- Review open trade proposals
- Review data quality warnings

## Monthly
- Generate monthly report
- Check rebalancing need
- Review approved ETF universe

## Quarterly
- Generate quarterly report
- Review strategy assumptions
- Review risk profile
- Review whether allocations should change
```

---

## 19. Safety Controls

### Must-have controls

- Dry-run mode.
- Read-only mode.
- Human approval by default.
- No trading when data is stale.
- No trading when broker account cannot be matched.
- No trading if holdings contain unknown instruments.
- No trading if strategy file has unresolved questions.
- No trading if risk limits are missing.
- No trading if proposed trade would violate allocation limits.
- No trading if market is closed unless explicitly supported.
- No repeated failed order submission.
- No storing secrets in Markdown.
- No leverage.
- No derivatives.
- No short selling.

### Approval levels

```markdown
Execution mode:
- propose_only: generate proposals only, never execute.
- require_confirmation: prepare trades, ask user before each execution.
- auto_trade_limited: execute only within strict predefined limits.
- auto_trade_full: execute rebalancing automatically within strategy constraints.
```

Default mode: `require_confirmation`.

---

## 20. Error Handling

All errors must be logged with:
- timestamp,
- portfolio,
- broker,
- operation,
- severity,
- safe summary,
- suggested resolution.

### Severity levels

- info
- warning
- error
- critical

### Critical errors must pause trading

Examples:
- authentication failure,
- broker account mismatch,
- unknown holdings,
- stale price data,
- failed order confirmation,
- inconsistent portfolio valuation,
- missing strategy constraints.

---

## 21. Template Portfolio

Generate `portfolio/_template/` with valid placeholder files.

The template should include:
- a conservative sample ETF strategy,
- sample target allocation,
- example approved instruments section,
- empty holdings table,
- empty trades table,
- empty history table,
- dashboard skeleton,
- report folder README.

The template must be safe to copy and rename.

---

## 22. MVP Build Order

Build in this order:

1. Create folder/file scaffolding.
2. Create portfolio template.
3. Implement structured Markdown parser/writer.
4. Implement portfolio creation workflow.
5. Implement strategy validation.
6. Implement IG broker adapter in read-only mode.
7. Implement holdings sync.
8. Implement dashboard generation.
9. Implement ETF suggestion workflow.
10. Implement trade proposal engine.
11. Implement dry-run order generation.
12. Implement trade log updates.
13. Implement history snapshots.
14. Implement weekly/monthly/quarterly reports.
15. Implement PDF export.
16. Add live execution only after dry-run validation.

---

## 23. Acceptance Criteria

The system is acceptable when:

- A new portfolio can be created interactively.
- The required Markdown files are generated correctly.
- Strategy validation identifies missing or unclear data.
- IG account can be connected in read-only mode.
- Current holdings can be synced into `holdings.md`.
- Portfolio valuation is calculated in CHF.
- Dashboard is regenerated correctly.
- ETF suggestions are generated and explained.
- Trade proposals are generated but not executed by default.
- Trades are logged append-only.
- History snapshots are written daily.
- Weekly, monthly, and quarterly reports are generated.
- PDF reports are generated.
- No secrets are written to Markdown files.
- Live trading is blocked until explicitly enabled.

---

## 24. First Portfolio to Create

Create the first real portfolio folder:

```text
portfolio/etf/
```

Initial settings:

```markdown
# Portfolio: ETF

## Status
- Status: draft
- Base currency: CHF
- Broker: ig
- Asset scope: ETF only
- Execution mode: require_confirmation
```

OpenClaw should then walk the user through the missing strategy and broker-account details before activating the portfolio.

---

## 25. Final Instruction to OpenClaw

Build this as a disciplined, modular portfolio-management system.

Optimise for:
- safety,
- clarity,
- auditability,
- low token use,
- reusable portfolio templates,
- broker portability,
- minimal hidden state,
- simple Markdown-based data storage.

Do not prioritise clever market timing. Prioritise strategy discipline, risk control, transparent decisions, and reliable execution.
