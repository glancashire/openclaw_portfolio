const fs = require('fs');
const path = require('path');
const { InteractiveBrokersClient } = require('./client');
const { readApprovedInstruments } = require('../../analysis/approvedInstruments');
const { readTradesTable, listExecutableTradeRows } = require('../../execution/tradeState');

async function getInteractiveBrokersReadiness({ portfolio = 'etf' } = {}) {
  const client = new InteractiveBrokersClient({ portfolio });
  const config = client.configurationStatus();
  const auth = await client.authenticate();
  const marketData = auth?.ok ? await detectMarketDataPosture(client, { portfolio }).catch(() => null) : null;
  return summarizeReadiness({ config, auth, marketData });
}

async function detectMarketDataPosture(client, { portfolio = 'etf' } = {}) {
  const probeCandidates = getProbeCandidates({ portfolio });
  const errors = [];

  for (const candidate of probeCandidates) {
    try {
      const conid = candidate?.conid || null;
      if (!conid) continue;
      const snapshot = await client.fetchMarketSnapshot([conid]);
      const quote = Array.isArray(snapshot) ? snapshot[0] : snapshot;
      const bid = asNumber(quote?.['84']);
      const ask = asNumber(quote?.['86']);
      const last = asNumber(quote?.['31']);
      const close = asNumber(quote?.['7295']) ?? asNumber(quote?.close);
      if ([bid, ask, last].some(Number.isFinite)) {
        return {
          posture: 'live_or_realtime',
          detail: `Live/realtime bid/ask/last values are available via ${candidate.label}.`,
          probe: candidate,
          probeSource: candidate?.source || 'unknown',
        };
      }
      if (Number.isFinite(close)) {
        return {
          posture: 'delayed_only',
          detail: `Delayed close fallback is available via ${candidate.label}, but live bid/ask/last are unavailable.`,
          probe: candidate,
          probeSource: candidate?.source || 'unknown',
        };
      }
      errors.push(`${candidate.label}: market data request returned no usable price fields`);
    } catch (error) {
      const message = String(error?.message || error || 'Unknown market data posture error.');
      if (/Delayed market data is available/i.test(message)) {
        return {
          posture: 'delayed_only',
          detail: `Interactive Brokers reports delayed market data is available via ${candidate.label}.`,
          probe: candidate,
          probeSource: candidate?.source || 'unknown',
        };
      }
      errors.push(`${candidate.label}: ${message}`);
    }
  }

  if (errors.length > 0) {
    return { posture: 'unknown', detail: errors.join(' | ') };
  }
  return { posture: 'unknown', detail: 'No probe contract conid available.' };
}

function getProbeCandidates({ portfolio = 'etf' } = {}) {
  const orderedGroups = [
    { source: 'executable_trade', items: getPortfolioExecutableProbeCandidates({ portfolio }) },
    { source: 'approved_instrument', items: getPortfolioApprovedProbeCandidates({ portfolio }) },
    { source: 'generic_fallback', items: getGenericFallbackProbeCandidates() },
  ];
  const byConid = new Map();
  const ordered = [];
  for (const group of orderedGroups) {
    for (const candidate of group.items) {
      const conid = String(candidate?.conid || '').trim();
      if (!conid || byConid.has(conid)) continue;
      const normalized = {
        ...candidate,
        source: candidate?.source || group.source,
      };
      byConid.set(conid, normalized);
      ordered.push(normalized);
    }
  }
  return ordered;
}

function getPortfolioExecutableProbeCandidates({ portfolio = 'etf' } = {}) {
  try {
    const portfolioDir = path.join(process.cwd(), 'portfolio', portfolio);
    const tradesPath = path.join(portfolioDir, 'trades.md');
    const portfolioPath = path.join(portfolioDir, 'portfolio.md');
    if (!fs.existsSync(tradesPath) || !fs.existsSync(portfolioPath)) return [];
    const executableRows = listExecutableTradeRows(tradesPath);
    const approved = readApprovedInstruments(portfolioPath);
    const approvedByTicker = new Map(approved.map((row) => [String(row.tickerOrIsin || '').trim().toUpperCase(), row]));
    return executableRows
      .map((row) => {
        const ticker = String(row.tickerOrIsin || '').trim().toUpperCase();
        const instrument = approvedByTicker.get(ticker);
        const conid = instrument?.ibkrConid || null;
        return conid ? {
          conid,
          symbol: instrument?.ibkrSymbol || ticker || null,
          tickerOrIsin: ticker || null,
          label: `executable trade ${ticker}`,
          source: 'executable_trade',
        } : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getPortfolioApprovedProbeCandidates({ portfolio = 'etf' } = {}) {
  try {
    const portfolioPath = path.join(process.cwd(), 'portfolio', portfolio, 'portfolio.md');
    if (!fs.existsSync(portfolioPath)) return [];
    return readApprovedInstruments(portfolioPath)
      .map((instrument) => instrument?.ibkrConid ? {
        conid: instrument.ibkrConid,
        symbol: instrument.ibkrSymbol || instrument.tickerOrIsin || null,
        tickerOrIsin: instrument.tickerOrIsin || null,
        label: `approved instrument ${instrument.tickerOrIsin || instrument.ibkrSymbol || instrument.ibkrConid}`,
        source: 'approved_instrument',
      } : null)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getGenericFallbackProbeCandidates() {
  return [
    { conid: '243939970', symbol: 'EMUAA', tickerOrIsin: 'LU0950668870', label: 'generic fallback EMUAA', source: 'generic_fallback' },
    { conid: '150029461', symbol: 'UBSSLI', tickerOrIsin: 'CH0032912732', label: 'generic fallback UBSSLI', source: 'generic_fallback' },
  ];
}

function summarizeReadiness({ config, auth, marketData }) {
  const delayedOnly = auth?.ok && marketData?.posture === 'delayed_only';
  const liveReady = auth?.ok && marketData?.posture === 'live_or_realtime';
  const authReadyButUnpriced = auth?.ok && !liveReady && !delayedOnly;
  const mode = auth?.mode || 'unknown';
  const marketDataMode = delayedOnly
    ? 'delayed'
    : liveReady
      ? 'live_or_realtime'
      : (authReadyButUnpriced ? (marketData?.posture || 'unpriced') : 'unavailable');
  const portalLikelyDiverged = mode === 'native-socket' && (liveReady || delayedOnly || authReadyButUnpriced);
  const authFailureDetail = String(auth?.error || auth?.diagnostics?.detail || '').trim();
  const authFailureSuffix = authFailureDetail ? ` Detail: ${authFailureDetail}` : '';
  const operatorState = deriveOperatorState({ auth, delayedOnly, liveReady, authReadyButUnpriced, marketData });
  const guidance = !auth?.ok
    ? operatorState.code === 'ibkr_login_or_2fa_pending'
      ? `Complete the manual login / 2FA step in IB Gateway, then rerun readiness. Do not auto-retry.${authFailureSuffix}`
      : operatorState.code === 'ibkr_socket_dead'
        ? `Restore native IBKR gateway connectivity first, then rerun readiness.${authFailureSuffix}`
        : `Restore native connectivity first.${authFailureSuffix}`
    : delayedOnly
      ? 'Broker connectivity is healthy, but the current quote posture is delayed-only (common outside market hours); keep live submission blocked unless delayed-only policy is explicitly accepted.'
      : authReadyButUnpriced
        ? 'Broker connectivity is up, but quote posture is still unclear; prefer native raw contract details / market-data probes before assuming a real outage.'
        : 'Broker path is healthy.';
  return {
    configured: Boolean(config?.ok),
    authenticated: Boolean(auth?.ok),
    reachable: auth?.reason !== 'http_error' ? Boolean(auth?.ok) : false,
    mode,
    fallbackRequired: !auth?.ok || delayedOnly || authReadyButUnpriced,
    marketDataMode,
    marketDataDetail: marketData?.detail || null,
    marketDataProbe: marketData?.probe || null,
    reason: liveReady
      ? 'ready'
      : delayedOnly
        ? 'delayed_data_only'
        : authReadyButUnpriced
          ? (marketData?.posture || 'unpriced')
          : auth?.reason || 'unknown',
    portalSessionState: portalLikelyDiverged ? 'unknown_or_separate' : 'not_applicable',
    operatorState,
    guidance,
    message: liveReady
      ? 'Interactive Brokers read-only connectivity and live/realtime market data are available.'
      : delayedOnly
        ? 'Interactive Brokers connectivity is available, but current API pricing is delayed-only (common outside market hours); broker-backed pricing may use delayed fallback values and live submission should remain blocked.'
        : authReadyButUnpriced
          ? 'Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture.'
          : auth?.reason === 'http_error'
            ? `Interactive Brokers gateway/session is not reachable; broker-backed pricing falls back to draft assumptions.${authFailureSuffix}`
            : `Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.${authFailureSuffix}`,
  };
}

function deriveOperatorState({ auth, delayedOnly, liveReady, authReadyButUnpriced, marketData }) {
  const detail = String(auth?.error || auth?.diagnostics?.detail || marketData?.detail || '').trim();
  if (!auth?.ok) {
    if (/awaiting login|login\s*\/\s*2fa|2fa|second-factor|verification|confirm/i.test(detail)) {
      return {
        code: 'ibkr_login_or_2fa_pending',
        summary: 'IBKR is waiting on a manual login/2FA step; keep recovery human-driven and do not auto-retry.',
        detail: detail || null,
      };
    }
    if (/ECONNREFUSED 127\.0\.0\.1:4001|connect ECONNREFUSED|socket hang up|gateway\/session is not reachable/i.test(detail)) {
      return {
        code: 'ibkr_socket_dead',
        summary: 'IBKR gateway appears offline or unreachable on the native API socket.',
        detail: detail || null,
      };
    }
    return {
      code: 'ibkr_auth_unready',
      summary: 'IBKR is not ready yet; inspect the native gateway/session state before relying on broker-backed actions.',
      detail: detail || null,
    };
  }

  if (liveReady) {
    return {
      code: 'ibkr_ready',
      summary: 'IBKR connectivity and live/realtime market data are available.',
      detail: detail || null,
    };
  }

  if (delayedOnly) {
    return {
      code: 'delayed_market_data_only',
      summary: 'IBKR connectivity is healthy, but only delayed market data is available right now.',
      detail: detail || null,
    };
  }

  if (authReadyButUnpriced) {
    return {
      code: 'broker_connected_quote_state_unclear',
      summary: 'IBKR connectivity is up, but the quote posture is still unclear and needs operator attention before assuming live readiness.',
      detail: detail || null,
    };
  }

  return {
    code: 'ibkr_unknown',
    summary: 'IBKR readiness is in an unknown state.',
    detail: detail || null,
  };
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  getInteractiveBrokersReadiness,
  summarizeReadiness,
  detectMarketDataPosture,
  getGenericFallbackProbeCandidates,
  getPortfolioApprovedProbeCandidates,
  getPortfolioExecutableProbeCandidates,
  getProbeCandidates,
};
