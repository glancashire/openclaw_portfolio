const https = require('https');
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
    this.skill = new InteractiveBrokersSkillClient(this.config);
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
          diagnostics: brokerDiagnostics({ mode: 'native', operation: 'authenticate', reason: 'native_error', detail: error.message }),
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
        diagnostics: brokerDiagnostics({ mode: 'skill', operation: 'authenticate', reason: 'skill_error', detail: skillStatus.error }),
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
        diagnostics: brokerDiagnostics({ mode: 'http', operation: 'authenticate', reason: 'http_error', detail: error.message }),
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
    const response = await fetch(`${this.baseUrl}${path}`, buildRequestOptions(`${this.baseUrl}${path}`, { method, body }));
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`IBKR request failed (${response.status}): ${text}`);
    }
    return safeJson(text);
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
      const close = asNumber(first?.close);
      const currency = first?.['85'] || contract.currency || 'CHF';
      const referencePrice = preferredReferencePrice({ bid, ask, last, close, action: order?.action });
      const quantity = Number(order?.quantity || 0);
      const estimatedValue = Number.isFinite(referencePrice) ? Number((referencePrice * quantity).toFixed(2)) : null;
      const delayedFallbackUsed = !Number.isFinite(preferredReferencePrice({ bid, ask, last, action: order?.action })) && Number.isFinite(close);
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
        priceSource: delayedFallbackUsed ? 'interactive-brokers-delayed-close-fallback' : 'interactive-brokers-marketdata',
        warning: delayedFallbackUsed
          ? 'Using delayed close fallback because live bid/ask/last were unavailable from API market data.'
          : (!Number.isFinite(referencePrice) ? 'No positive quote reference price available.' : null),
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
        diagnostics: brokerDiagnostics({ mode: activeMode(this), operation: 'get_order_quote', reason: 'quote_error', detail: error.message }),
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

  async placeOrder(order, { dryRun = true, revocableOnly = true, transmitLive = false } = {}) {
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
        mode: 'read_only_preview',
        order: preview,
        quote: quoteResult.quote || null,
        diagnostics: quoteResult.ok ? null : brokerDiagnostics({ mode: activeMode(this), operation: 'place_order', reason: 'quote_unavailable', detail: quoteResult.error || 'Quote data unavailable during dry-run preview.' }),
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
      return blockedBrokerOperation({
        operation: 'place_order',
        reason: 'policy_blocked',
        message: 'Non-revocable live order paths are blocked by policy.',
        mode: activeMode(this),
        portfolio: this.options.portfolio,
        order,
      });
    }
    if (transmitLive && order?.transmit !== true) {
      return blockedBrokerOperation({
        operation: 'place_order',
        reason: 'policy_blocked',
        message: 'Transmitted live submission requires order.transmit=true explicit intent.',
        mode: activeMode(this),
        portfolio: this.options.portfolio,
        order,
      });
    }
    const action = String(order?.action || '').toUpperCase();
    const orderType = String(order?.orderType || 'LMT').toUpperCase();
     if (action === 'BUY' && orderType === 'MKT') {
       return blockedBrokerOperation({
         operation: 'place_order',
         reason: 'policy_blocked',
         message: 'Market buy orders are blocked; use a revocable limit-style path only.',
         mode: activeMode(this),
         portfolio: this.options.portfolio,
         order,
       });
     }
    if (transmitLive === true && this.native && typeof this.native.placeOrder === 'function') {
      try {
        const placed = await this.native.placeOrder(order);
        const normalizedOrder = normaliseOrder(placed || {});
        return {
          ok: true,
          dryRun: false,
          submitted: true,
          mode: 'transmitted_live',
          order: { ...normalizedOrder, transmit: true },
          brokerErrors: [],
          quote: quoteResult.quote || null,
          message: 'Interactive Brokers transmitted live order submitted via native client.',
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'place_order',
            status: 'transmitted_live',
            summary: {
              symbol: order?.symbol || null,
              action,
              quantity: Number(order?.quantity || 0),
              orderType,
              transmit: true,
              transmittedLiveAck: 'present',
              clientMode: 'native',
            },
            portfolio: this.options.portfolio,
          }),
        };
      } catch (error) {
        return {
          ok: false,
          reason: 'submit_error',
          error: error.message,
          diagnostics: brokerDiagnostics({ mode: activeMode(this), operation: 'place_order', reason: 'submit_error', detail: error.message }),
          order,
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'place_order',
            status: 'submit_error',
            summary: { message: error.message, symbol: order?.symbol || null, clientMode: 'native' },
            portfolio: this.options.portfolio,
          }),
        };
      }
    }
    if (!this.skill || typeof this.skill.placeOrder !== 'function') {
      return blockedBrokerOperation({
        operation: 'place_order',
        reason: 'not_available',
        message: transmitLive === true
          ? 'Transmitted live submission is not available because neither the native nor skill-backed order-placement client is ready.'
          : 'Revocable non-transmitted live submission scaffold is only available via the skill-backed client right now.',
        mode: activeMode(this),
        portfolio: this.options.portfolio,
        order,
      });
    }
    if (action === 'BUY' && orderType === 'MKT') {
      return blockedBrokerOperation({
        operation: 'place_order',
        reason: 'policy_blocked',
        message: 'Market buy orders are blocked; use a revocable limit-style path only.',
        mode: activeMode(this),
        portfolio: this.options.portfolio,
        order,
      });
    }
    try {
      const placed = await this.skill.placeOrder(order, { transmit: transmitLive === true });
      const normalizedOrder = normaliseOrder(placed.trade || {});
      const transmitted = transmitLive === true;
      return {
        ok: true,
        dryRun: false,
        submitted: transmitted,
        mode: transmitted ? 'transmitted_live' : 'staged_not_transmitted',
        order: { ...normalizedOrder, transmit: transmitted ? true : false },
        brokerErrors: placed.errors || [],
        quote: quoteResult.quote || null,
        message: transmitted
          ? 'Interactive Brokers transmitted live order submitted to broker.'
          : 'Interactive Brokers non-transmitted order scaffold created; order was not transmitted.',
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'place_order',
          status: transmitted ? 'transmitted_live' : 'staged_not_transmitted',
          summary: {
            symbol: order?.symbol || null,
            action,
            quantity: Number(order?.quantity || 0),
            orderType,
            transmit: transmitted,
            transmittedLiveAck: transmitted ? 'present' : 'not_required',
          },
          portfolio: this.options.portfolio,
        }),
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'submit_error',
        error: error.message,
        diagnostics: brokerDiagnostics({ mode: activeMode(this), operation: 'place_order', reason: 'submit_error', detail: error.message }),
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
      return blockedBrokerOperation({
        operation: 'get_order_status',
        reason: 'not_available',
        message: 'Interactive Brokers open-order status lookup is not available for the current broker client mode.',
        mode: activeMode(this),
        portfolio: this.options.portfolio,
        orderId,
      });
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
        const symbolHints = completedOrders
          .filter((row) => row && row.symbol)
          .map((row) => ({
            orderId: row.orderId ?? null,
            permId: row.permId ?? null,
            symbol: row.symbol || null,
            status: row.status || null,
            quantity: row.quantity ?? null,
          }));
        if (symbolHints.length > 0) {
          return {
            ok: false,
            reason: 'not_found',
            orderId,
            diagnostics: brokerDiagnostics({
              mode: activeMode(this),
              operation: 'get_order_status',
              reason: 'not_found',
              detail: 'No exact open/execution/completed order id match found, but completed-order hints are available for operator review.',
            }),
            message: 'No exact broker order id match was found, but completed-order hints are available.',
            hints: {
              completedOrders: symbolHints,
            },
          };
        }
      }

      return {
        ok: false,
        reason: 'not_found',
        orderId,
        diagnostics: brokerDiagnostics({ mode: activeMode(this), operation: 'get_order_status', reason: 'not_found', detail: 'No matching open order, execution fill, or completed order found.' }),
        message: 'No matching open order or execution fill found.',
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'status_error',
        error: error.message,
        diagnostics: brokerDiagnostics({ mode: activeMode(this), operation: 'get_order_status', reason: 'status_error', detail: error.message }),
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
      return blockedBrokerOperation({
        operation: 'cancel_order',
        reason: 'not_available',
        message: 'Interactive Brokers order cancellation is only available via the skill-backed client right now.',
        mode: activeMode(this),
        portfolio: this.options.portfolio,
        orderId,
      });
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
        diagnostics: brokerDiagnostics({ mode: activeMode(this), operation: 'cancel_order', reason: 'cancel_error', detail: error.message }),
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

function buildRequestOptions(url, { method = 'GET', body } = {}) {
  const options = {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  };
  if (shouldUseInsecureLocalTls(url)) {
    options.agent = new https.Agent({ rejectUnauthorized: false });
  }
  return options;
}

function shouldUseInsecureLocalTls(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
  } catch {
    return false;
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
    diagnostics: brokerDiagnostics({ mode: 'unconfigured', operation: 'authenticate', reason, detail: `Missing configuration: ${(missing || []).join(', ')}` }),
    log: logBrokerEvent({
      broker: 'interactive-brokers',
      operation: 'authenticate',
      status: 'blocked',
      summary: { missing },
      portfolio,
    }),
  };
}

function blockedBrokerOperation({ operation, reason, message, mode, portfolio, ...rest }) {
  return {
    ok: false,
    reason,
    message,
    diagnostics: brokerDiagnostics({ mode, operation, reason, detail: message }),
    ...rest,
    log: logBrokerEvent({
      broker: 'interactive-brokers',
      operation,
      status: reason,
      summary: { message, mode },
      portfolio,
    }),
  };
}

function brokerDiagnostics({ mode, operation, reason, detail }) {
  return {
    broker: 'interactive-brokers',
    mode: mode || 'unknown',
    operation,
    reason,
    detail,
  };
}

function activeMode(client) {
  if (client.skill) return 'skill';
  if (client.native) return 'native';
  return 'http';
}

function resolveOrderContract(order = {}) {
  return {
    conid: order.conid || order.ibkrConid || order.identifier || null,
    symbol: order.symbol || order.ticker || null,
    currency: order.currency || null,
    exchange: order.exchange || null,
    primaryExchange: order.primaryExchange || order.primaryExch || null,
    secType: order.secType || null,
  };
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function preferredReferencePrice({ bid, ask, last, close, action }) {
  const normalizedAction = String(action || '').toUpperCase();
  if (normalizedAction === 'BUY') return firstPositive([ask, last, bid, close]);
  if (normalizedAction === 'SELL') return firstPositive([bid, last, ask, close]);
  return firstPositive([last, ask, bid, close]);
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

module.exports = { InteractiveBrokersClient, aggregateExecutionFills, brokerDiagnostics, activeMode, buildRequestOptions, shouldUseInsecureLocalTls };
