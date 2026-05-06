# Portfolio: acceptance-closure

## Status
- Status: draft
- Created: YYYY-MM-DD
- Last reviewed: YYYY-MM-DD
- Base currency: CHF
- Broker: interactive-brokers
- Broker account reference: <account_alias_or_safe_identifier>
- Execution mode: require_confirmation
- Asset scope: ETF only

## Strategy Summary
Conservative sample ETF strategy used as a safe acceptance-closure. Replace with portfolio-specific goals before activation.

## Investor Profile
- Risk level: medium
- Investment horizon: <years>
- Liquidity needs: low
- Maximum acceptable drawdown: <%>
- Income requirement: none
- ESG preference: none
- Currency preference: CHF-first

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 50 | 40 | 60 | Broad developed-market ETF |
| Swiss equities | 20 | 10 | 30 | CHF exposure |
| Bonds / cash-like | 30 | 20 | 40 | CHF bonds or money-market ETF |

## Geographic Targets
| Region | Target % | Min % | Max % |
|---|---:|---:|---:|
| Switzerland | 20 | 10 | 30 |
| Developed World ex-CH | 50 | 35 | 65 |
| Emerging Markets | 30 | 0 | 35 |

## Industry / Sector Constraints
| Sector | Min % | Max % | Notes |
|---|---:|---:|---|
| Technology | 0 | 30 | Avoid excessive concentration |
| Financials | 0 | 25 | Avoid excessive concentration |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| <ticker / isin> | <name> | Global equities | 50 | 40 | 60 | <exchange> | CHF | Example placeholder |
| <ticker / isin> | <name> | Swiss equities | 20 | 10 | 30 | <exchange> | CHF | Example placeholder |
| <ticker / isin> | <name> | Bonds / cash-like | 30 | 20 | 40 | <exchange> | CHF | Example placeholder |

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|
| <ticker / isin> | <reason> |

## Rebalancing Policy
- Check frequency: daily
- Rebalance frequency: monthly or when thresholds are breached
- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%
- Minimum trade size: CHF <amount>
- Avoid unnecessary trades: true
- Prefer using new cash before selling: true

## Market Entry Policy
- Initial deployment mode: staged
- Deployment period: 5-20 trading days
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
- Replace all placeholders before activation.
- Confirm ETF universe and broker account mapping.
