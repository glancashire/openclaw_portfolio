function redact(value) {
  if (value == null) return value;
  const text = String(value);
  if (text.length <= 8) return '***';
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function safeSummary(summary = {}) {
  const out = { ...summary };
  for (const key of Object.keys(out)) {
    if (/token|secret|password|api.?key|authorization/i.test(key)) {
      out[key] = redact(out[key]);
    }
  }
  return out;
}

function logBrokerEvent({ broker, operation, status, summary, portfolio }) {
  return {
    timestamp: new Date().toISOString(),
    broker,
    operation,
    status,
    portfolio: portfolio || null,
    summary: safeSummary(summary),
  };
}

module.exports = { redact, safeSummary, logBrokerEvent };
