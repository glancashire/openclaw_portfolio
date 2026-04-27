# Repo Plan

## Purpose

This reference summarizes how to translate `SPECIFICATION.md` into repository structure and implementation phases.

## Required top-level structure

```text
portfolio/
  _template/
  etf/
brokers/
  ig/
  swissquote/
runtime/
  logs/
  cache/
  snapshots/
  reports/
config/
```

## Initial implementation targets

### Scaffolding phase
Create:
- `portfolio/_template/portfolio.md`
- `portfolio/_template/holdings.md`
- `portfolio/_template/trades.md`
- `portfolio/_template/history.md`
- `portfolio/_template/dashboard.md`
- `portfolio/_template/reports/README.md`
- `portfolio/etf/portfolio.md`
- `portfolio/etf/holdings.md`
- `portfolio/etf/trades.md`
- `portfolio/etf/history.md`
- `portfolio/etf/dashboard.md`
- `portfolio/etf/reports/weekly/`
- `portfolio/etf/reports/monthly/`
- `portfolio/etf/reports/quarterly/`
- `brokers/ig/adapter.md`
- `brokers/ig/auth.md`
- `brokers/ig/instruments.md`
- `brokers/ig/orders.md`
- `brokers/swissquote/adapter.md`
- `config/openclaw.md`
- `config/schedules.md`
- `config/risk_limits.md`

### Logic phase
Introduce code only after the file contracts are stable.

Suggested implementation modules:
- markdown parser/writer
- strategy validator
- holdings normalizer
- valuation engine
- rebalance analyzer
- trade proposal engine
- report generator
- broker adapter interface
- IG implementation

## Design guardrails

- One broker per portfolio.
- No secrets in Markdown.
- Every material action must be logged.
- Dry-run must exist before live execution.
- Unknown holdings or unresolved questions should block trading.
