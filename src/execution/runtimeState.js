const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(process.cwd(), 'runtime', 'execution-state.json');

function readExecutionState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return { brokerErrors: {} };
  }
}

function writeExecutionState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  return STATE_PATH;
}

function recordBrokerError({ portfolio = 'default', reason = 'unknown', message = '' }) {
  const state = readExecutionState();
  state.brokerErrors ||= {};
  const bucket = state.brokerErrors[portfolio] || { consecutive: 0, lastReason: null, lastMessage: null, lastAt: null };
  bucket.consecutive = Number(bucket.consecutive || 0) + 1;
  bucket.lastReason = reason;
  bucket.lastMessage = message;
  bucket.lastAt = new Date().toISOString();
  state.brokerErrors[portfolio] = bucket;
  writeExecutionState(state);
  return bucket;
}

function clearBrokerErrors(portfolio = 'default') {
  const state = readExecutionState();
  state.brokerErrors ||= {};
  state.brokerErrors[portfolio] = { consecutive: 0, lastReason: null, lastMessage: null, lastAt: new Date().toISOString() };
  writeExecutionState(state);
  return state.brokerErrors[portfolio];
}

function brokerErrorStatus(portfolio = 'default', threshold = 3) {
  const state = readExecutionState();
  const bucket = state.brokerErrors?.[portfolio] || { consecutive: 0 };
  return {
    consecutive: Number(bucket.consecutive || 0),
    lastReason: bucket.lastReason || null,
    lastMessage: bucket.lastMessage || null,
    lastAt: bucket.lastAt || null,
    stopAutomation: Number(bucket.consecutive || 0) >= threshold,
    threshold,
  };
}

module.exports = {
  STATE_PATH,
  readExecutionState,
  writeExecutionState,
  recordBrokerError,
  clearBrokerErrors,
  brokerErrorStatus,
};
