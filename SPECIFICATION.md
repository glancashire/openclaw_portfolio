# OpenClaw Portfolio Manager — Build Specification

## 1. Purpose

Create a new OpenClaw instance that manages investment portfolios across broker/provider platforms via APIs.

The system should help enforce a defined portfolio strategy with disciplined allocation, monitoring, gradual deployment of capital, rebalancing, audit reporting, and clear human approval gates.

The first supported broker is **Interactive Brokers**. The architecture should allow additional brokers later, such as **Swissquote**, but the MVP implementation should stay focused on Interactive Brokers only.

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
- Interactive Brokers Web API adapter.
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
 interactive-brokers/
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
- Broker: interactive-brokers
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
- Broker adapter: interactive-brokers
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
- Broker: interactive-brokers
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

## 12. Interactive Brokers Adapter — MVP Requirements

The first broker adapter should support Interactive Brokers.
You can find the documentation here [IBKR Web API | IBKR Campus](https://www.interactivebrokers.eu/campus/ibkr-api-page/web-api/)
### Required capabilities

- Authenticate using secure credential storage.
- List available Interactive Brokers accounts.
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

### Required report contents

1. Period covered.
2. Portfolio value start/end.
3. Cash level.
4. Holdings summary.
5. Allocation drift summary.
6. Trades proposed/executed.
7. Strategy compliance review.
8. What worked.
9. What did not work.
10. Recommended changes.
11. Next actions.

---

## 18. Scheduling

Use OpenClaw schedules/config to support:
- daily holdings sync,
- daily rebalance check,
- weekly report generation,
- monthly report generation,
- quarterly report generation.

All scheduled actions must remain safe under read-only/dry-run constraints.

---

## 19. Safety / Operational Rules

1. Never store broker credentials in Markdown files.
2. Never execute live trades by default.
3. Never trade instruments outside approved ETF scope.
4. Never trade when unresolved portfolio questions remain.
5. Never trade when holdings sync is stale or failed.
6. Never trade when broker authentication is broken.
7. Never ignore min/max allocation constraints.
8. Never hide automation state from the user.
9. Always preserve human-readable audit logs.
10. Always allow dry-run simulation before any live execution path.

---

## 20. Error Handling Requirements

- Broker/API failures must be logged safely.
- Partial data should produce warnings, not silent success.
- Unknown holdings should block automated trading.
- Missing price data should block order generation.
- Repeated broker errors should stop automation until reviewed.

---

## 21. Template Portfolio

Provide a default starter portfolio at `portfolio/etf/` showing:
- CHF base currency,
- Interactive Brokers account linkage,
- diversified ETF allocation,
- staged deployment,
- explicit safety/approval settings,
- clear open questions until the portfolio is activation-ready.

---

## 22. MVP Build Order

1. Folder/file scaffolding.
2. Template portfolio.
3. Structured Markdown parser/writer.
4. Portfolio creation workflow.
5. Strategy validation.
6. Interactive Brokers adapter in read-only mode.
7. Holdings sync.
8. Dashboard generation.
9. ETF suggestion workflow.
10. Trade proposal engine.
11. Dry-run order generation.
12. Trade log updates.
13. History snapshots.
14. Reports.
15. PDF export.
16. Live execution only after dry-run validation.

---

## 23. Acceptance Criteria for MVP

The MVP is acceptable when:

1. A new ETF portfolio can be created from a workflow into valid Markdown files.
2. The portfolio remains blocked from live action until required questions are resolved.
3. Interactive Brokers account connectivity works in read-only mode.
4. Holdings sync produces valid `holdings.md`.
5. Rebalance analysis explains what is off-target and why.
6. Dry-run trade proposals are generated and logged.
7. Dashboard updates correctly after state changes.
8. Weekly/monthly/quarterly reports can be generated.
9. All outputs remain human-readable and auditable.
10. No credentials are stored in Markdown.

---

## 24. First Portfolio to Create

The first real portfolio should be a simple long-only ETF portfolio with:
- CHF base currency,
- broad developed-market core,
- Swiss home-market sleeve,
- defensive CHF sleeve,
- staged capital deployment,
- strict approval before live trading.
