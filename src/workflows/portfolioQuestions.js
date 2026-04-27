const QUESTION_FIELDS = [
  { key: 'portfolioName', prompt: 'Portfolio name', section: 'identity' },
  { key: 'broker', prompt: 'Broker', section: 'status' },
  { key: 'brokerAccountReference', prompt: 'Broker account alias/reference', section: 'status' },
  { key: 'baseCurrency', prompt: 'Base currency', section: 'status' },
  { key: 'initialCapital', prompt: 'Initial capital / expected portfolio size', section: 'strategy' },
  { key: 'investmentHorizon', prompt: 'Investment horizon', section: 'investor-profile' },
  { key: 'riskLevel', prompt: 'Risk level', section: 'investor-profile' },
  { key: 'maximumAcceptableDrawdown', prompt: 'Maximum acceptable drawdown', section: 'investor-profile' },
  { key: 'targetAssetClasses', prompt: 'Target asset classes', section: 'allocation' },
  { key: 'geographicPreferences', prompt: 'Geographic preferences', section: 'allocation' },
  { key: 'sectorPreferences', prompt: 'Sector exclusions or preferences', section: 'allocation' },
  { key: 'esgPreference', prompt: 'ESG preference', section: 'investor-profile' },
  { key: 'issuerPreferences', prompt: 'ETF issuer preferences or exclusions', section: 'instrument-selection' },
  { key: 'rebalancingTolerance', prompt: 'Rebalancing tolerance', section: 'rebalancing' },
  { key: 'automatedExecutionAllowed', prompt: 'Whether automated execution is allowed', section: 'automation' },
  { key: 'stagedMarketEntryDesired', prompt: 'Whether staged market entry is desired', section: 'market-entry' },
  { key: 'excludedInstruments', prompt: 'Excluded instruments', section: 'instrument-selection' },
  { key: 'alreadyHeldInstruments', prompt: 'Instruments already held', section: 'holdings' },
];

module.exports = { QUESTION_FIELDS };
