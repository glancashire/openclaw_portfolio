function getVenueHoursReference(venue = '') {
  const key = String(venue || '').trim().toUpperCase();
  const references = {
    IBIS: {
      venue: 'IBIS',
      sourceKind: 'reference',
      confidence: 'medium',
      label: 'IBIS / Xetra-style reference',
      session: { open: '09:00', close: '17:30' },
      notes: 'Reference fallback based on local captured European cash ETF venue hours; prefer IBKR contract hours when available.'
    },
    EBS: {
      venue: 'EBS',
      sourceKind: 'reference',
      confidence: 'high',
      label: 'SIX Swiss Exchange ETF/ETP',
      session: { open: '09:00', close: '17:30' },
      notes: 'Reference based on SIX ETF / ETSF / ETP trading hours.'
    },
    ETFPLUS: {
      venue: 'ETFPLUS',
      sourceKind: 'reference',
      confidence: 'high',
      label: 'Borsa Italiana ETFplus',
      session: { open: '09:04', close: '17:30' },
      notes: 'Continuous trading session reference; opening/closing auctions omitted from simplified fallback state.'
    },
  };
  return references[key] || {
    venue: key || 'UNKNOWN',
    sourceKind: 'reference',
    confidence: 'low',
    label: key || 'UNKNOWN',
    session: null,
    notes: 'No reliable structured local venue-hours reference found.'
  };
}

function hhmmToMinutes(value) {
  const [hh, mm] = String(value || '').split(':').map((part) => Number(part));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function evaluateVenueReferenceState(reference, now = new Date()) {
  if (!reference?.session?.open || !reference?.session?.close) {
    return { status: 'unknown', sourceKind: reference?.sourceKind || 'reference', reference };
  }
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const open = hhmmToMinutes(reference.session.open);
  const close = hhmmToMinutes(reference.session.close);
  if (open == null || close == null) {
    return { status: 'unknown', sourceKind: reference?.sourceKind || 'reference', reference };
  }
  if (minutes < open) return { status: 'before_open', sourceKind: reference.sourceKind, reference };
  if (minutes > close) return { status: 'after_close', sourceKind: reference.sourceKind, reference };
  return { status: 'open', sourceKind: reference.sourceKind, reference };
}

module.exports = {
  getVenueHoursReference,
  evaluateVenueReferenceState,
};
