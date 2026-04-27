const REQUIRED_SECTIONS = [
  'Status',
  'Strategy Summary',
  'Investor Profile',
  'Allocation Targets',
  'Geographic Targets',
  'Industry / Sector Constraints',
  'Approved Instruments',
  'Excluded Instruments',
  'Rebalancing Policy',
  'Market Entry Policy',
  'Risk Limits',
  'Broker Access',
  'Automation Permissions',
  'Notes / Open Questions',
];

const REQUIRED_STATUS_LINES = [
  'Status:',
  'Created:',
  'Last reviewed:',
  'Base currency:',
  'Broker:',
  'Broker account reference:',
  'Execution mode:',
  'Asset scope:',
];

module.exports = { REQUIRED_SECTIONS, REQUIRED_STATUS_LINES };
