const fs = require('fs');
const path = require('path');
const { parseHoursSegments, evaluateHoursState, deriveTodayStatus, extractHolidays } = require('./marketCalendar');

function marketCalendarArtifactPath({ portfolioDir, runtimeRoot = path.join(process.cwd(), 'runtime') } = {}) {
  const portfolio = path.basename(portfolioDir || 'unknown');
  return path.join(runtimeRoot, 'market-calendar', `${portfolio}.json`);
}

function summarizeCoverage(instruments = []) {
  const rows = Array.isArray(instruments) ? instruments : [];
  return rows.reduce((acc, item) => {
    acc.totalApprovedInstruments += 1;
    if (item?.hasIbkrIdentity) acc.withIbkrIdentity += 1;
    if (item?.syncStatus === 'ok') acc.synced += 1;
    if (item?.syncStatus === 'missing_identity') acc.missingIdentity += 1;
    if (item?.syncStatus && item.syncStatus !== 'ok' && item.syncStatus !== 'missing_identity') acc.syncFailed += 1;
    return acc;
  }, {
    totalApprovedInstruments: 0,
    withIbkrIdentity: 0,
    synced: 0,
    missingIdentity: 0,
    syncFailed: 0,
  });
}

function normalizeInstrumentCalendarRow(row = {}, now = new Date()) {
  const tradingHoursRaw = row.tradingHoursRaw || row.tradingHours || '';
  const liquidHoursRaw = row.liquidHoursRaw || row.liquidHours || '';
  const tradingHoursSegments = Array.isArray(row.tradingHoursSegments) ? row.tradingHoursSegments : parseHoursSegments(tradingHoursRaw);
  const liquidHoursSegments = Array.isArray(row.liquidHoursSegments) ? row.liquidHoursSegments : parseHoursSegments(liquidHoursRaw);
  const hasIbkrIdentity = Boolean(row.ibkrConid || row.ibkrSymbol || row.ibkrLocalSymbol || row.ibkrPrimaryExchange);
  const syncStatus = row.syncStatus || (hasIbkrIdentity ? 'ok' : 'missing_identity');
  const todayStatus = row.todayStatus || deriveTodayStatus(tradingHoursSegments, liquidHoursSegments, now);
  const holidays = row.holidays || extractHolidays(tradingHoursSegments);

  return {
    tickerOrIsin: row.tickerOrIsin || null,
    name: row.name || null,
    ibkrConid: row.ibkrConid || null,
    ibkrSymbol: row.ibkrSymbol || null,
    ibkrLocalSymbol: row.ibkrLocalSymbol || null,
    ibkrPrimaryExchange: row.ibkrPrimaryExchange || null,
    exchange: row.exchange || null,
    currency: row.currency || null,
    tradingHoursRaw: tradingHoursRaw || '',
    liquidHoursRaw: liquidHoursRaw || '',
    tradingHoursSegments,
    liquidHoursSegments,
    tradingStateNow: row.tradingStateNow || evaluateHoursState(tradingHoursSegments, now),
    liquidStateNow: row.liquidStateNow || evaluateHoursState(liquidHoursSegments, now),
    todayStatus,
    holidays,
    sourceKind: row.sourceKind || 'ibkr_contract',
    lastSyncedAt: row.lastSyncedAt || null,
    syncStatus,
    hasIbkrIdentity,
    error: row.error || null,
  };
}

function buildMarketCalendarArtifact({ portfolioDir, generatedAt = new Date().toISOString(), source = 'ibkr_contract_hours', brokerReady = false, instruments = [], now = new Date(), preNormalized = false } = {}) {
  const portfolio = path.basename(portfolioDir || 'unknown');
  const normalized = preNormalized
    ? (Array.isArray(instruments) ? instruments : [])
    : (Array.isArray(instruments) ? instruments : []).map((row) => normalizeInstrumentCalendarRow(row, now));

  // Derive top-level holidays union across all instruments
  const allHolidays = new Set();
  for (const inst of normalized) {
    if (Array.isArray(inst.holidays)) {
      for (const h of inst.holidays) allHolidays.add(h);
    }
  }

  return {
    portfolio,
    generatedAt,
    source,
    brokerReady: Boolean(brokerReady),
    coverage: summarizeCoverage(normalized),
    holidays: [...allHolidays].sort(),
    instruments: normalized,
  };
}

function readMarketCalendarArtifact({ portfolioDir, runtimeRoot, fallback = null } = {}) {
  const artifactPath = marketCalendarArtifactPath({ portfolioDir, runtimeRoot });
  try {
    return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeMarketCalendarArtifact({ portfolioDir, runtimeRoot, artifact } = {}) {
  const artifactPath = marketCalendarArtifactPath({ portfolioDir, runtimeRoot });
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  const tempPath = `${artifactPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(artifact, null, 2));
  fs.renameSync(tempPath, artifactPath);
  return artifactPath;
}

module.exports = {
  marketCalendarArtifactPath,
  summarizeCoverage,
  normalizeInstrumentCalendarRow,
  buildMarketCalendarArtifact,
  readMarketCalendarArtifact,
  writeMarketCalendarArtifact,
};
