const fs = require('fs');
const path = require('path');

function normalizeIds(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))).sort((a, b) => a - b);
}

function defaultFillNotificationState() {
  return {
    notifiedFills: [],
    reconciledUnnotifiedFills: [],
    acknowledgedBackfilledFills: [],
  };
}

function fillNotificationStatePath(repoRoot) {
  return path.join(repoRoot, 'runtime', 'fill-notifications-state.json');
}

function loadFillNotificationState(repoRoot) {
  try {
    const statePath = fillNotificationStatePath(repoRoot);
    if (!fs.existsSync(statePath)) return defaultFillNotificationState();
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return {
      notifiedFills: normalizeIds(parsed?.notifiedFills),
      reconciledUnnotifiedFills: normalizeIds(parsed?.reconciledUnnotifiedFills),
      acknowledgedBackfilledFills: normalizeIds(parsed?.acknowledgedBackfilledFills),
    };
  } catch {
    return defaultFillNotificationState();
  }
}

function saveFillNotificationState(repoRoot, state) {
  const statePath = fillNotificationStatePath(repoRoot);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const next = {
    notifiedFills: normalizeIds(state?.notifiedFills),
    reconciledUnnotifiedFills: normalizeIds(state?.reconciledUnnotifiedFills),
    acknowledgedBackfilledFills: normalizeIds(state?.acknowledgedBackfilledFills),
  };
  fs.writeFileSync(statePath, JSON.stringify(next, null, 2));
  return next;
}

function acknowledgeBackfilledFills(state, orderIds = []) {
  const next = {
    notifiedFills: normalizeIds(state?.notifiedFills),
    reconciledUnnotifiedFills: normalizeIds(state?.reconciledUnnotifiedFills),
    acknowledgedBackfilledFills: normalizeIds(state?.acknowledgedBackfilledFills),
  };
  const acknowledgeSet = new Set(normalizeIds(orderIds));
  next.reconciledUnnotifiedFills = next.reconciledUnnotifiedFills.filter((id) => !acknowledgeSet.has(id));
  next.acknowledgedBackfilledFills = normalizeIds(next.acknowledgedBackfilledFills.concat(Array.from(acknowledgeSet)));
  return next;
}

function markFillsNotified(state, orderIds = []) {
  const next = {
    notifiedFills: normalizeIds(state?.notifiedFills),
    reconciledUnnotifiedFills: normalizeIds(state?.reconciledUnnotifiedFills),
    acknowledgedBackfilledFills: normalizeIds(state?.acknowledgedBackfilledFills),
  };
  const notifiedSet = new Set(normalizeIds(orderIds));
  next.notifiedFills = normalizeIds(next.notifiedFills.concat(Array.from(notifiedSet)));
  next.reconciledUnnotifiedFills = next.reconciledUnnotifiedFills.filter((id) => !notifiedSet.has(id));
  next.acknowledgedBackfilledFills = next.acknowledgedBackfilledFills.filter((id) => !notifiedSet.has(id));
  return next;
}

module.exports = {
  defaultFillNotificationState,
  fillNotificationStatePath,
  loadFillNotificationState,
  saveFillNotificationState,
  acknowledgeBackfilledFills,
  markFillsNotified,
};
