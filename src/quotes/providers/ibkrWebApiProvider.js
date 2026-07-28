'use strict';

const { getDefaultBaseUrl, loadInteractiveBrokersConfig, shouldUseInsecureLoopbackTls } = require('../../brokers/interactive-brokers/config');

function parseNumber(value) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function fetchJson(url, { method = 'GET', body = null } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    agent: shouldUseInsecureLoopbackTls(url) ? false : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`IBKR Web API request failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function fetchWebApiAuthStatus(baseUrl) {
  return fetchJson(`${baseUrl}/iserver/auth/status`);
}

async function fetchWebApiSnapshot(baseUrl, conid) {
  return fetchJson(`${baseUrl}/iserver/marketdata/snapshot?conids=${encodeURIComponent(String(conid))}&fields=${encodeURIComponent('31,84,85,86,87,88,7295')}`);
}

module.exports = {
  id: 'ibkr_web_api',
  label: 'IBKR Web API',
  async fetchQuote(context = {}) {
    if (!context.conid) {
      return { ok: false, reason: 'missing_conid', note: 'IBKR Web API provider requires conid.' };
    }

    const cfg = loadInteractiveBrokersConfig();
    const configuredBaseUrl = String(process.env.IBKR_WEB_API_BASE_URL || cfg.baseUrl || getDefaultBaseUrl()).trim();
    const baseUrl = configuredBaseUrl || getDefaultBaseUrl();

    try {
      const auth = await fetchWebApiAuthStatus(baseUrl);
      const authenticated = Boolean(auth?.authenticated || auth?.connected);
      if (!authenticated) {
        return {
          ok: false,
          reason: 'ibkr_web_api_auth_failed',
          note: 'IBKR Web API session is not authenticated.',
          raw: auth || null,
        };
      }

      const raw = await fetchWebApiSnapshot(baseUrl, context.conid);
      const first = Array.isArray(raw) ? raw[0] : raw;
      const bid = parseNumber(first?.['84']);
      const ask = parseNumber(first?.['86']);
      const last = parseNumber(first?.['31']);
      const delayedBid = parseNumber(first?.['88']) ?? parseNumber(first?.delayedBid);
      const delayedAsk = parseNumber(first?.['87']) ?? parseNumber(first?.delayedAsk);
      const close = parseNumber(first?.['7295']) ?? parseNumber(first?.close);
      const price = ask || bid || last || delayedAsk || delayedBid || close || null;
      if (!price) {
        return {
          ok: false,
          reason: 'no_usable_fields',
          note: 'IBKR Web API returned no usable price fields.',
          raw: first,
        };
      }

      let quality = 'stale_or_unknown';
      if (ask || bid || last) quality = 'live_or_realtime';
      else if (delayedAsk || delayedBid || close) quality = 'last_close';
      return {
        ok: true,
        price,
        bid,
        ask,
        last,
        close,
        currency: first?.['85'] || first?.currency || null,
        providerPath: 'ibkr_web_api',
        providerLabel: 'IBKR Web API',
        quality,
        asOf: new Date().toISOString(),
        note: quality === 'live_or_realtime'
          ? 'Resolved from direct IBKR Web API market snapshot.'
          : 'Resolved from direct IBKR Web API delayed/close-style snapshot fields.',
        raw: first,
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'ibkr_web_api_request_failed',
        note: String(error?.message || error || 'IBKR Web API request failed.'),
        raw: null,
      };
    }
  },
};
