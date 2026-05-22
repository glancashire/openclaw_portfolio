'use strict';

/* Phase 200 — Quote-quality classifier.
 *
 * Tier rules:
 *   - 'live'        : both live ask (field 86) and live last (field 31) present, with a recent lastTimestamp.
 *   - 'one_sided'   : exactly one of {ask, last} present.
 *   - 'stale_only'  : neither ask nor live last present, only close (7295) and/or stale 31 fallback.
 *   - 'unknown'     : nothing usable.
 *
 * snapshot is the raw shape returned by InteractiveBrokersClient.native.fetchMarketSnapshot:
 *   { conid, currency, "31"?: number, "84"?: number, "86"?: number, "7295"?: number, close?: number, lastTimestamp?: string }
 */

function isPositiveNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function classifyQuoteQuality(snapshot) {
  const observed = {};
  if (snapshot && typeof snapshot === 'object') {
    if (isPositiveNumber(snapshot['31'])) observed.last = Number(snapshot['31']);
    if (isPositiveNumber(snapshot['84'])) observed.bid = Number(snapshot['84']);
    if (isPositiveNumber(snapshot['86'])) observed.ask = Number(snapshot['86']);
    if (isPositiveNumber(snapshot['7295'])) observed.close = Number(snapshot['7295']);
    else if (isPositiveNumber(snapshot.close)) observed.close = Number(snapshot.close);
    if (snapshot.lastTimestamp) observed.lastTimestamp = String(snapshot.lastTimestamp);
  }
  const haveAsk = 'ask' in observed;
  const haveLast = 'last' in observed;
  const haveLiveLast = haveLast && 'lastTimestamp' in observed;
  const haveStaleLastFallback = haveLast && !haveLiveLast && 'close' in observed && observed.last === observed.close;
  const haveClose = 'close' in observed;
  const missingFields = [];
  if (!haveAsk) missingFields.push('ask');
  if (!('bid' in observed)) missingFields.push('bid');
  if (!haveLiveLast) missingFields.push('liveLast');

  let tier;
  if (haveAsk && haveLiveLast) tier = 'live';
  else if (haveAsk || haveLiveLast) tier = 'one_sided';
  else if (haveClose || haveStaleLastFallback) tier = 'stale_only';
  else tier = 'unknown';

  return { tier, missingFields, observedFields: observed };
}

function tierSeverity(tier) {
  switch (tier) {
    case 'live': return 'ok';
    case 'one_sided': return 'warning';
    case 'stale_only': return 'attention';
    case 'unknown': return 'critical';
    default: return 'unknown';
  }
}

function tierSummaryLine(leg, classification) {
  if (!classification) return '';
  const sev = tierSeverity(classification.tier);
  return `${leg.ibkrSymbol || leg.instrument}: quote=${classification.tier} (${sev}); missing=${classification.missingFields.join(',') || 'none'}`;
}

module.exports = { classifyQuoteQuality, tierSeverity, tierSummaryLine };
