const fs = require('fs');
const path = require('path');

const EVENTS_DIR = path.join(process.cwd(), 'runtime', 'events');
const EVENTS_PATH = path.join(EVENTS_DIR, 'runtime-events.jsonl');

function ensureEventsPath() {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
  return EVENTS_PATH;
}

function normalizeLevel(level) {
  const normalized = String(level || 'info').trim().toLowerCase();
  return ['debug', 'info', 'warn', 'error'].includes(normalized) ? normalized : 'info';
}

function normalizeText(value, fallback = '') {
  if (value == null) return fallback;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text == null ? fallback : text;
}

function sanitizeDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return {};
  return details;
}

function recordRuntimeEvent({
  timestamp = new Date().toISOString(),
  level = 'info',
  category = 'general',
  action = 'event',
  portfolio = 'default',
  mode = 'unknown',
  status = 'observed',
  summary = '',
  details = {},
} = {}) {
  const event = {
    timestamp,
    level: normalizeLevel(level),
    category: normalizeText(category, 'general'),
    action: normalizeText(action, 'event'),
    portfolio: normalizeText(portfolio, 'default'),
    mode: normalizeText(mode, 'unknown'),
    status: normalizeText(status, 'observed'),
    summary: normalizeText(summary, ''),
    details: sanitizeDetails(details),
  };
  const outPath = ensureEventsPath();
  fs.appendFileSync(outPath, JSON.stringify(event) + '\n');
  return { path: outPath, event };
}

function readRuntimeEvents({ limit = 50, category = null, portfolio = null, level = null } = {}) {
  if (!fs.existsSync(EVENTS_PATH)) return [];
  const lines = fs.readFileSync(EVENTS_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // ignore malformed lines to keep inspection resilient
    }
  }
  return events
    .filter((event) => !category || String(event.category) === String(category))
    .filter((event) => !portfolio || String(event.portfolio) === String(portfolio))
    .filter((event) => !level || String(event.level) === String(level))
    .slice(-Math.max(0, Number(limit) || 0));
}

function summarizeRuntimeEvents(events = []) {
  const summary = {
    total: events.length,
    byLevel: {},
    byCategory: {},
    blockedTrades: 0,
    degradedBrokerEvents: 0,
    staleDataEvents: 0,
  };
  for (const event of events) {
    const level = String(event.level || 'info');
    const category = String(event.category || 'general');
    summary.byLevel[level] = (summary.byLevel[level] || 0) + 1;
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
    if (String(event.status || '').toLowerCase().includes('blocked')) summary.blockedTrades += 1;
    if (String(event.action || '').toLowerCase().includes('broker') && String(event.level || '') === 'warn') summary.degradedBrokerEvents += 1;
    if (String(event.summary || '').toLowerCase().includes('stale')) summary.staleDataEvents += 1;
  }
  return summary;
}

module.exports = {
  EVENTS_DIR,
  EVENTS_PATH,
  recordRuntimeEvent,
  readRuntimeEvents,
  summarizeRuntimeEvents,
};
