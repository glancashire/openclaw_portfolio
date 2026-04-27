const { IgBrokerAdapter } = require('../src/brokers/ig/adapter');

const adapter = new IgBrokerAdapter({ portfolio: 'etf', dryRun: true, readOnly: true });
const accounts = adapter.list_accounts([{ accountId: 'abc123', accountName: 'Main ETF', currency: 'CHF' }]);
const holdings = adapter.get_holdings([{ isin: 'CH0000000001', name: 'Sample ETF', quantity: 10, price: 101.5, currency: 'CHF' }]);
const quote = adapter.get_order_quote({ action: 'buy', identifier: 'CH0000000001', quantity: 5, estimatedValue: 500 });
console.log(JSON.stringify({ accounts, holdings, quote }, null, 2));
