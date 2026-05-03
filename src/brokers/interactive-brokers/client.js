const { loadInteractiveBrokersConfig, validateInteractiveBrokersConfig } = require('./config');
const { logBrokerEvent } = require('../shared/safeLogger');
const { normaliseOrder, normaliseOrderQuote, normaliseCancelResult } = require('./types');
const { InteractiveBrokersNativeClient } = require('./nativeClient');
const { InteractiveBrokersSkillClient } = require('./skillClient');

class InteractiveBrokersClient {
  constructor(options = {}) {
    this.options = options;
    this.config = loadInteractiveBrokersConfig();
    this.baseUrl = this.config.baseUrl;
    this.native = this.config.mode === 'native' ? new InteractiveBrokersNativeClient(this.config) : null;
    this.skill = this.config.mode === 'skill' ? new InteractiveBrokersSkillClient(this.config) : null;
  }

  configurationStatus() {
    return validateInteractiveBrokersConfig(this.config);
  }

  async authenticate() {
    const status = this.configurationStatus();
    if (!status.ok) {
      return blocked('missing_config', status.missing, this.options.portfolio);
    }

    if (this.native) {
      try {
        const nativeStatus = await this.native.authenticate();
        return {
          ok: true,
          mode: 'native-socket',
          authStatus: nativeStatus,
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'authenticate',
            status: 'ok',
            summary: { connected: nativeStatus?.connected ?? null, mode: 'native' },
            portfolio: this.options.portfolio,
          }),
        };
      } catch (error) {
        return {
          ok: false,
          reason: 'native_error',
          error: error.message,
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'authenticate',
            status: 'native_error',
            summary: { message: error.message },
            portfolio: this.options.portfolio,
          }),
        };
      }
    }

    if (this.skill) {
      const skillStatus = await this.skill.authenticate();
      if (skillStatus.ok) {
        return {
          ok: true,
          mode: 'skill-ib_insync',
          authStatus: skillStatus,
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'authenticate',
            status: 'ok',
            summary: { connected: true, mode: 'skill' },
            portfolio: this.options.portfolio,
          }),
        };
      }
      return {
        ok: false,
        reason: 'skill_error',
        error: skillStatus.error,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'authenticate',
          status: 'skill_error',
          summary: { message: skillStatus.error },
          portfolio: this.options.portfolio,
        }),
      };
    }

    try {
      const authStatus = await this.request('/iserver/auth/status');
      return {
        ok: true,
        mode: 'session-status',
        authStatus,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'authenticate',
          status: 'ok',
          summary: { authenticated: authStatus?.authenticated ?? null },
          portfolio: this.options.portfolio,
        }),
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'http_error',
        error: error.message,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'authenticate',
          status: 'http_error',
          summary: { message: error.message },
          portfolio: this.options.portfolio,
        }),
      };
    }
  }

  async request(path, { method = 'GET', body } = {}) {
    const previousTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    const relaxTls = this.baseUrl.startsWith('https://localhost') || this.baseUrl.startsWith('https://127.0.0.1');
    if (relaxTls) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`IBKR request failed (${response.status}): ${text}`);
      }
      return safeJson(text);
    } finally {
      if (relaxTls) {
        if (previousTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTls;
      }
    }
  }

  async sessionStatus() {
    return this.request('/tickle');
  }

  async fetchAuthStatus() {
    return this.request('/iserver/auth/status');
  }

  async fetchAccounts() {
    if (this.native) return this.native.fetchAccounts();
    if (this.skill) return this.skill.fetchAccounts();
    return this.request('/portfolio/accounts');
  }

  async fetchLedger(accountId) {
    if (!accountId) throw new Error('fetchLedger requires accountId');
    if (this.native) return this.native.fetchLedger(accountId);
    if (this.skill) return this.skill.fetchLedger(accountId);
    return this.request(`/portfolio/${encodeURIComponent(accountId)}/ledger`);
  }

  async searchContracts(query) {
    if (!query) throw new Error('searchContracts requires query');
    if (this.native) return this.native.searchContracts(query);
    if (this.skill) return this.skill.searchContracts(query);
    return this.request(`/iserver/secdef/search?symbol=${encodeURIComponent(query)}`);
  }

  async fetchMarketSnapshot(conids, fields = ['31', '84', '85', '86']) {
    const list = Array.isArray(conids) ? conids.filter(Boolean).join(',') : String(conids || '');
    if (!list) throw new Error('fetchMarketSnapshot requires at least one conid');
    if (this.native) return this.native.fetchMarketSnapshot(Array.isArray(conids) ? conids : [conids], fields);
    if (this.skill) return this.skill.fetchMarketSnapshot(Array.isArray(conids) ? conids : [conids], fields);
    const fieldList = Array.isArray(fields) ? fields.join(',') : String(fields || '31,84,85,86');
    return this.request(`/iserver/marketdata/snapshot?conids=${encodeURIComponent(list)}&fields=${encodeURIComponent(fieldList)}`);
  }

  async fetchPositions(accountId) {
    if (this.native) return this.native.fetchPositions(accountId);
    if (this.skill) return this.skill.fetchPositions(accountId);
    if (!accountId) throw new Error('fetchPositions requires accountId');
    return this.request(`/portfolio/${encodeURIComponent(accountId)}/positions/0`);
  }

  assertWritable(action = 'broker write') {
    if (this.config.readonly) {
      throw new Error(`Interactive Brokers is configured readonly=true; refusing ${action}`);
    }
  }

  async getOrderQuote(order) {
    const contract = resolveOrderContract(order);
    try {
      const snapshot = await this.fetchMarketSnapshot([contract.conid]);
      const first = Array.isArray(snapshot) ? snapshot[0] : snapshot;
      const bid = asNumber(first?.['84']);
      const ask = asNumber(first?.['86']);
      const last = asNumber(first?.['31']);
      const currency = first?.['85'] || contract.currency || 'CHF';
      const referencePrice = preferredReferencePrice({ bid, ask, last, action: order?.action });
      const quantity = Number(order?.quantity || 0);
      const estimatedValue = Number.isFinite(referencePrice) ? Number((referencePrice * quantity).toFixed(2)) : null;
      const quote = normaliseOrderQuote({
        ok: true,
        identifier: contract.conid || contract.symbol,
        symbol: contract.symbol || null,
        currency,
        action: order?.action || null,
        orderType: order?.orderType || 'LMT',
        quantity,
        referencePrice,
        bid,
        ask,
        last,
        estimatedValue,
        priceSource: 'interactive-brokers-marketdata',
        warning: !Number.isFinite(referencePrice) ? 'No positive quote reference price available.' : null,
      });
      return {
        ok: true,
        quote,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'get_order_quote',
          status: 'ok',
          summary: {
            identifier: quote.identifier,
            quantity: quote.quantity,
            referencePrice: quote.referencePrice,
            estimatedValue: quote.estimatedValue,
            currency: quote.currency,
          },
          portfolio: this.options.portfolio,
        }),
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'quote_error',
        error: error.message,
        order,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'get_order_quote',
          status: 'quote_error',
          summary: { message: error.message, identifier: contract.conid || contract.symbol || null },
          portfolio: this.options.portfolio,
        }),
      };
    }
  }

  async placeOrder(order, { dryRun = true, revocableOnly = true } = {}) {
    if (dryRun !== true) this.assertWritable('live order placement');
    const quoteResult = await this.getOrderQuote(order);
    if (dryRun === true) {
      const preview = normaliseOrder({
        orderId: null,
        status: quoteResult.ok ? 'simulated' : 'quote_unavailable',
        action: order?.action || null,
        identifier: order?.conid || order?.symbol || null,
        symbol: order?.symbol || null,
        quantity: order?.quantity || 0,
        limitPrice: order?.limitPrice || quoteResult.quote?.referencePrice || null,
        estimatedValue: quoteResult.quote?.estimatedValue || 0,
        currency: quoteResult.quote?.currency || order?.currency || 'CHF',
        transmit: false,
      });
      return {
        ok: true,
        dryRun: true,
        order: preview,
        quote: quoteResult.quote || null,
        message: 'Interactive Brokers dry-run order preview generated; no broker write attempted.',
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'place_order',
          status: 'dry_run',
          summary: {
            identifier: preview.identifier,
            action: preview.action,
            quantity: preview.quantity,
            estimatedValue: preview.estimatedValue,
            currency: preview.currency,
          },
          portfolio: this.options.portfolio,
        }),
      };
    }

    if (!revocableOnly) {
      return {
        ok: false,
        reason: 'policy_blocked',
        message: 'Non-revocable live order paths are blocked by policy.',
        order,
      };
    }
    if (!this.skill || typeof this.skill.placeOrder !== 'function') {
      return {
        ok: false,
        reason: 'not_available',
        message: 'Revocable non-transmitted live submission scaffold is only available via the skill-backed client right now.',
        order,
      };
    }
    const action = String(order?.action || '').toUpperCase();
    const orderType = String(order?.orderType || 'LMT').toUpperCase();
    if (action === 'BUY' && orderType === 'MKT') {
      return {
        ok: false,
        reason: 'policy_blocked',
        message: 'Market buy orders are blocked; use a revocable limit-style path only.',
        order,
      };
    }
    try {
      const placed = await this.skill.placeOrder(order, { transmit: false });
      return {
        ok: true,
        dryRun: false,
        submitted: false,
        order: normaliseOrder(placed.trade || {}),
        brokerErrors: placed.errors || [],
        quote: quoteResult.quote || null,
        message: 'Interactive Brokers non-transmitted order scaffold created; order was not transmitted.',
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'place_order',
          status: 'staged_not_transmitted',
          summary: {
            symbol: order?.symbol || null,
            action,
            quantity: Number(order?.quantity || 0),
            orderType,
          },
          portfolio: this.options.portfolio,
        }),
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'submit_error',
        error: error.message,
        order,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'place_order',
          status: 'submit_error',
          summary: { message: error.message, symbol: order?.symbol || null },
          portfolio: this.options.portfolio,
        }),
      };
    }
  }

  async getOrderStatus(orderId) {
    const openOrderReader = this.native && typeof this.native.fetchOpenOrders === 'function'
      ? this.native
      : this.skill && typeof this.skill.fetchOpenOrders === 'function'
        ? this.skill
        : null;
    if (!openOrderReader) {
      return {
        ok: false,
        reason: 'not_available',
        message: 'Interactive Brokers open-order status lookup is not available for the current broker client mode.',
        orderId,
      };
    }
    try {
      const orders = await openOrderReader.fetchOpenOrders();
      const openMatch = orders.find((row) => String(row.orderId) === String(orderId));
      if (openMatch) {
        return {
          ok: true,
          order: normaliseOrder(openMatch),
          source: 'open_orders',
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'get_order_status',
            status: 'ok',
            summary: { orderId: openMatch.orderId, status: openMatch.status, symbol: openMatch.symbol || null, source: 'open_orders' },
            portfolio: this.options.portfolio,
          }),
        };
      }

      if (this.skill && typeof this.skill.fetchExecutions === 'function') {
        const executions = await this.skill.fetchExecutions();
        const fills = executions.filter((row) => String(row.orderId) === String(orderId));
        if (fills.length > 0) {
          const aggregated = aggregateExecutionFills(fills, orderId);
          return {
            ok: true,
            order: normaliseOrder(aggregated),
            source: 'executions',
            log: logBrokerEvent({
              broker: 'interactive-brokers',
              operation: 'get_order_status',
              status: 'ok',
              summary: { orderId: aggregated.orderId, status: aggregated.status, symbol: aggregated.symbol || null, source: 'executions' },
              portfolio: this.options.portfolio,
            }),
          };
        }
      }

      if (this.skill && typeof this.skill.fetchCompletedOrders === 'function') {
        const completedOrders = await this.skill.fetchCompletedOrders();
        const completedMatch = completedOrders.find((row) => String(row.orderId) === String(orderId));
        if (completedMatch) {
          return {
            ok: true,
            order: normaliseOrder(completedMatch),
            source: 'completed_orders',
            log: logBrokerEvent({
              broker: 'interactive-brokers',
              operation: 'get_order_status',
              status: 'ok',
              summary: { orderId: completedMatch.orderId, status: completedMatch.status, symbol: completedMatch.symbol || null, source: 'completed_orders' },
              portfolio: this.options.portfolio,
            }),
          };
        }
      }

      return {
        ok: false,
        reason: 'not_found',
        orderId,
        message: 'No matching open order or execution fill found.',
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'status_error',
        error: error.message,
        orderId,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'get_order_status',
          status: 'status_error',
          summary: { orderId, message: error.message },
          portfolio: this.options.portfolio,
        }),
      };
    }
  }

  async cancelOrder(orderId) {
    this.assertWritable('order cancellation');
    if (!this.skill || typeof this.skill.cancelOrder !== 'function') {
      return {
        ok: false,
        reason: 'not_available',
        message: 'Interactive Brokers order cancellation is only available via the skill-backed client right now.',
        orderId,
      };
    }
    try {
      const result = await this.skill.cancelOrder(orderId);
      const cancel = normaliseCancelResult(result);
      return {
        ok: true,
        cancel,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'cancel_order',
          status: 'ok',
          summary: { orderId: cancel.orderId, status: cancel.status },
          portfolio: this.options.portfolio,
        }),
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'cancel_error',
        error: error.message,
        orderId,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'cancel_order',
          status: 'cancel_error',
          summary: { orderId, message: error.message },
          portfolio: this.options.portfolio,
        }),
      };
    }
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function blocked(reason, missing, portfolio) {
  return {
    ok: false,
    reason,
    missing,
    log: logBrokerEvent({
      broker: 'interactive-brokers',
      operation: 'authenticate',
      status: 'blocked',
      summary: { missing },
      portfolio,
    }),
  };
}

function resolveOrderContract(order = {}) {
  return {
    conid: order.conid || order.ibkrConid || order.identifier || null,
    symbol: order.symbol || order.ticker || null,
    currency: order.currency || null,
  };
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function preferredReferencePrice({ bid, ask, last, action }) {
  const normalizedAction = String(action || '').toUpperCase();
  if (normalizedAction === 'BUY') return firstPositive([ask, last, bid]);
  if (normalizedAction === 'SELL') return firstPositive([bid, last, ask]);
  return firstPositive([last, ask, bid]);
}

function firstPositive(values) {
  for (const value of values) {
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function aggregateExecutionFills(fills, orderId) {
  const ordered = [...fills].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
  const totalShares = ordered.reduce((sum, row) => sum + Number(row.shares || 0), 0);
  const totalValue = ordered.reduce((sum, row) => sum + (Number(row.shares || 0) * Number(row.price || 0)), 0);
  const avgFillPrice = totalShares > 0 ? Number((totalValue / totalShares).toFixed(6)) : null;
  const last = ordered[ordered.length - 1] || {};
  return {
    orderId,
    symbol: last.symbol || null,
    secType: last.secType || null,
    side: last.side || null,
    status: 'Filled',
    quantity: totalShares,
    filled: totalShares,
    remaining: 0,
    avgFillPrice,
    lastFillPrice: numberOrNull(last.price),
    estimatedValue: Number(totalValue.toFixed(2)),
    currency: last.currency || 'CHF',
    time: last.time || null,
    execId: last.execId || null,
    raw: { fills: ordered },
  };
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = { InteractiveBrokersClient, aggregateExecutionFills };
