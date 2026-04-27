const { logBrokerEvent } = require('../shared/safeLogger');
const {
  normaliseAccount,
  normaliseCashBalance,
  normaliseHolding,
  normaliseInstrument,
  normalisePrice,
  normaliseOrder,
} = require('./types');

class IgBrokerAdapter {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun !== false,
      readOnly: options.readOnly !== false,
      portfolio: options.portfolio || null,
      credentials: options.credentials || null,
    };
  }

  authenticate() {
    return {
      ok: false,
      mode: 'stub',
      log: logBrokerEvent({
        broker: 'ig',
        operation: 'authenticate',
        status: 'stub',
        portfolio: this.options.portfolio,
        summary: { readOnly: this.options.readOnly, dryRun: this.options.dryRun },
      }),
    };
  }

  list_accounts(rawAccounts = []) {
    return rawAccounts.map(normaliseAccount);
  }

  select_account(accountReference, rawAccounts = []) {
    const accounts = this.list_accounts(rawAccounts);
    return accounts.find(
      (account) =>
        account.accountId === accountReference ||
        account.accountName === accountReference
    ) || null;
  }

  get_cash_balances(rawBalances = []) {
    return rawBalances.map(normaliseCashBalance);
  }

  get_holdings(rawHoldings = []) {
    return rawHoldings.map(normaliseHolding);
  }

  get_instrument_details(rawInstrument = {}) {
    return normaliseInstrument(rawInstrument);
  }

  search_instruments(rawResults = []) {
    return rawResults.map(normaliseInstrument);
  }

  get_latest_price(rawPrice = {}) {
    return normalisePrice(rawPrice);
  }

  get_order_quote(order = {}) {
    return {
      dryRun: true,
      broker: 'ig',
      order,
      estimated: normaliseOrder({ ...order, status: 'quoted' }),
      log: logBrokerEvent({
        broker: 'ig',
        operation: 'get_order_quote',
        status: 'ok',
        portfolio: this.options.portfolio,
        summary: { action: order.action, identifier: order.identifier, quantity: order.quantity },
      }),
    };
  }

  place_order(order, dry_run = true) {
    if (!dry_run || !this.options.dryRun) {
      throw new Error('Live order placement is disabled in the MVP stub. Use dry-run only.');
    }
    return {
      submitted: false,
      dryRun: true,
      simulatedOrder: normaliseOrder({ ...order, status: 'simulated' }),
      log: logBrokerEvent({
        broker: 'ig',
        operation: 'place_order',
        status: 'simulated',
        portfolio: this.options.portfolio,
        summary: { action: order.action, identifier: order.identifier, quantity: order.quantity },
      }),
    };
  }

  get_order_status(rawOrder = {}) {
    return normaliseOrder(rawOrder);
  }

  cancel_order(orderId) {
    return {
      cancelled: false,
      orderId,
      log: logBrokerEvent({
        broker: 'ig',
        operation: 'cancel_order',
        status: 'stub',
        portfolio: this.options.portfolio,
        summary: { orderId },
      }),
    };
  }

  normalise_broker_holding(rawHolding) {
    return normaliseHolding(rawHolding);
  }

  normalise_broker_order(rawOrder) {
    return normaliseOrder(rawOrder);
  }
}

module.exports = { IgBrokerAdapter };
