const CONTRACTS = {
  'portfolio.md': {
    requiredStrings: [
      '# Portfolio:',
      '## Status',
      '## Strategy Summary',
      '## Investor Profile',
      '## Allocation Targets',
      '## Geographic Targets',
      '## Industry / Sector Constraints',
      '## Approved Instruments',
      '## Excluded Instruments',
      '## Rebalancing Policy',
      '## Market Entry Policy',
      '## Risk Limits',
      '## Broker Access',
      '## Automation Permissions',
      '## Notes / Open Questions',
    ],
  },
  'holdings.md': {
    requiredStrings: [
      '# Holdings:',
      '## Last Sync',
      '## Current Holdings',
      '## Cash',
      '## Data Quality',
      '| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |',
      '| Currency | Amount | FX rate to CHF | Value CHF |',
    ],
  },
  'trades.md': {
    requiredStrings: [
      '# Trades:',
      '## Trade Log',
      '| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |',
    ],
  },
  'history.md': {
    requiredStrings: [
      '# History:',
      '## Daily Valuation History',
      '| Date | Snapshot | Total value CHF | Invested CHF | Net deposited CHF | Cash CHF | Daily change CHF | Daily change % | Notes |',
    ],
  },
  'dashboard.md': {
    requiredStrings: [
      '# Dashboard:',
      '## Summary',
      '## Allocation vs Target',
      '## Instrument Overview',
      '## Recommended Actions',
      '## Risk Warnings',
      '## Recent Trades',
      '| Asset class | Current % | Target % | Drift % | Status |',
      '| Ticker / ISIN | Name | Value CHF | Current % | Target % | Drift % | Action |',
      '| Date | Action | Instrument | Amount CHF | Status |',
    ],
  },
};

module.exports = { CONTRACTS };
