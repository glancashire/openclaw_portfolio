function normalizedUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function parseUbspxGateTimestamp() {
  const gateMs = Date.parse('2026-05-21T07:00:00Z');
  return Number.isFinite(gateMs) ? gateMs : null;
}

const UBSPX_GATE_LABEL = '20260521 09:00:00 MET';

function shouldForceUbspxGate(options = {}) {
  return options.forcePreOpenGate === true || options.applyLegacyUbspxGate === true;
}

function applyExecutionTimingPolicy(order = {}, instrument = null, options = {}) {
  const next = { ...order };
  const symbol = normalizedUpper(order?.symbol || instrument?.ibkrSymbol || '');
  const primaryExchange = normalizedUpper(order?.primaryExchange || instrument?.ibkrPrimaryExchange || '');
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();

  if (!next.tif) next.tif = 'DAY';

  if (symbol === 'UBSPX' && primaryExchange === 'IBIS') {
    if (next.outsideRth == null) next.outsideRth = false;
    const gateMs = parseUbspxGateTimestamp();
    if (!next.goodAfterTime && (shouldForceUbspxGate(options) || (gateMs != null && nowMs < gateMs))) {
      next.goodAfterTime = UBSPX_GATE_LABEL;
    }
  }

  return next;
}

module.exports = { applyExecutionTimingPolicy, UBSPX_GATE_LABEL };
