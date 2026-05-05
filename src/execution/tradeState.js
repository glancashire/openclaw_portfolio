const fs = require('fs');

const TRADE_HEADERS = [
  'Date/time',
  'Status',
  'Action',
  'Ticker / ISIN',
  'Name',
  'Quantity',
  'Limit price',
  'Estimated CHF',
  'Actual CHF',
  'Reason',
  'Approval',
  'Broker order id',
];

function readTradesTable(tradesPath) {
  const text = fs.readFileSync(tradesPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim() === '## Trade Log');
  if (headerIndex === -1) throw new Error(`Trade Log section not found in ${tradesPath}`);

  const rowIndexes = [];
  const rows = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) break;
    if (!line.startsWith('|')) continue;
    if (line.includes('|---|') || line.includes('| Date/time |')) continue;
    rowIndexes.push(i);
    rows.push(parseTradeLine(line));
  }

  return { text, lines, rowIndexes, rows };
}

function parseTradeLine(line) {
  const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
  const row = {};
  for (let i = 0; i < TRADE_HEADERS.length; i++) row[TRADE_HEADERS[i]] = cells[i] ?? '';
  return row;
}

function formatTradeLine(row) {
  const cells = TRADE_HEADERS.map((header) => row[header] ?? '');
  return `| ${cells.join(' | ')} |`;
}

function matchesTradeSelector(row, selector = {}) {
  if (selector.orderId && String(row['Broker order id'] || '') !== String(selector.orderId)) return false;
  if (selector.dateTime && String(row['Date/time'] || '') !== String(selector.dateTime)) return false;
  if (selector.tickerOrIsin && String(row['Ticker / ISIN'] || '') !== String(selector.tickerOrIsin)) return false;
  if (selector.status && String(row.Status || '') !== String(selector.status)) return false;
  if (selector.action && String(row.Action || '').toLowerCase() !== String(selector.action || '').toLowerCase()) return false;
  return true;
}

function updateTradeRows(tradesPath, selector, mutateRow) {
  const table = readTradesTable(tradesPath);
  let updated = 0;
  table.rows.forEach((row, idx) => {
    if (!matchesTradeSelector(row, selector)) return;
    const next = mutateRow({ ...row }, idx);
    if (!next) return;
    table.lines[table.rowIndexes[idx]] = formatTradeLine(next);
    updated += 1;
  });
  if (updated > 0) fs.writeFileSync(tradesPath, table.lines.join('\n'));
  return { updated };
}

function appendTradeEvent(tradesPath, event, timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)) {
  const lines = fs.readFileSync(tradesPath, 'utf8').trimEnd();
  const row = formatTradeLine({
    'Date/time': timestamp,
    'Status': event.status || 'proposed',
    'Action': event.action || '',
    'Ticker / ISIN': event.tickerOrIsin || '',
    'Name': event.name || '',
    'Quantity': String(event.quantity ?? 0),
    'Limit price': String(event.limitPrice ?? 0),
    'Estimated CHF': String(event.estimatedChf ?? 0),
    'Actual CHF': String(event.actualChf ?? 0),
    'Reason': event.reason || '',
    'Approval': event.approval || '',
    'Broker order id': event.brokerOrderId || '',
  });
  fs.writeFileSync(tradesPath, `${lines}\n${row}\n`);
  return { appended: true, row };
}

function latestPendingProposalDate(rows, row) {
  const ticker = String(row['Ticker / ISIN'] || '').trim();
  const action = String(row.Action || '').trim().toLowerCase();
  let latest = null;

  for (const candidate of rows) {
    const candidateStatus = String(candidate.Status || '').trim().toLowerCase();
    const candidateApproval = String(candidate.Approval || '').trim();
    if (!['proposed', 'planned'].includes(candidateStatus)) continue;
    if (candidateApproval !== 'pending_user_approval') continue;
    if (String(candidate['Ticker / ISIN'] || '').trim() !== ticker) continue;
    if (String(candidate.Action || '').trim().toLowerCase() !== action) continue;
    const date = String(candidate['Date/time'] || '').trim();
    if (!latest || date > latest) latest = date;
  }

  return latest;
}

function markTradeApproved(tradesPath, selector, approval = 'user_approved') {
  const table = readTradesTable(tradesPath);
  let updated = 0;

  table.rows.forEach((row, idx) => {
    if (!matchesTradeSelector(row, selector)) return;
    const status = String(row.Status || '').trim().toLowerCase();
    if (!['proposed', 'planned'].includes(status)) return;

    const rowDate = String(row['Date/time'] || '').trim();
    const latestDate = latestPendingProposalDate(table.rows, row);
    if (latestDate && rowDate !== latestDate) return;

    table.lines[table.rowIndexes[idx]] = formatTradeLine({
      ...row,
      Status: 'approved',
      Approval: approval,
    });
    updated += 1;
  });

  if (updated > 0) fs.writeFileSync(tradesPath, table.lines.join('\n'));
  return { updated };
}

function reconcileOrderStatus(tradesPath, selector, brokerOrder = {}, options = {}) {
  const mappedStatus = mapBrokerOrderStatus(brokerOrder.status, brokerOrder);
  const approval = options.approval || inferApproval(mappedStatus, brokerOrder);
  const actualChf = numberText(
    brokerOrder.avgFillPrice && brokerOrder.filled
      ? Number(brokerOrder.avgFillPrice) * Number(brokerOrder.filled)
      : brokerOrder.estimatedValue
  );
  return updateTradeRows(tradesPath, selector, (row) => ({
    ...row,
    Status: mappedStatus,
    Approval: approval,
    'Broker order id': brokerOrder.orderId != null ? String(brokerOrder.orderId) : row['Broker order id'],
    'Actual CHF': actualChf || row['Actual CHF'],
    Reason: appendReasonNote(row.Reason, options.reasonNote || buildBrokerReasonNote(brokerOrder, mappedStatus)),
  }));
}

function mapBrokerOrderStatus(status, brokerOrder = {}) {
  const raw = String(status || '').trim().toLowerCase();
  const filled = Number(brokerOrder.filled || 0);
  const remaining = Number(brokerOrder.remaining || 0);
  const hasPartialFill = filled > 0 && remaining > 0;
  const hasCompleteFill = filled > 0 && remaining <= 0;

  if (!raw) {
    if (brokerOrder.notFound === true) return 'failed';
    if (hasPartialFill) return 'partially_filled';
    if (hasCompleteFill) return 'filled';
    return brokerOrder.orderId ? 'submitted' : 'approved';
  }
  if (['partially_filled', 'partial', 'partial_fill'].includes(raw) || hasPartialFill) return 'partially_filled';
  if (raw === 'filled' || hasCompleteFill) return 'filled';
  if (['submitted', 'presubmitted', 'api_pending', 'pending_submit', 'pendingcancel'].includes(raw)) return 'submitted';
  if (['cancelled', 'canceled', 'cancel_requested', 'pending_cancel'].includes(raw)) return 'cancelled';
  if (['inactive', 'rejected', 'failed', 'error', 'not_found', 'missing'].includes(raw)) return 'failed';
  if (raw === 'simulated') return 'simulated';
  if (raw === 'quote_unavailable') return 'planned';
  return 'submitted';
}

function inferApproval(status, brokerOrder = {}) {
  if (status === 'approved') return 'user_approved';
  if (status === 'submitted') return brokerOrder.transmit === false ? 'staged_not_transmitted' : 'submitted_to_broker';
  if (status === 'partially_filled' || status === 'filled') return 'broker_filled';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'failed') return 'broker_failed';
  return 'user_approved';
}

function buildBrokerReasonNote(brokerOrder, mappedStatus) {
  const parts = [`broker status ${brokerOrder.status || mappedStatus}`];
  if (brokerOrder.orderId != null) parts.push(`order id ${brokerOrder.orderId}`);
  if (brokerOrder.filled != null) parts.push(`filled ${brokerOrder.filled}`);
  if (brokerOrder.remaining != null) parts.push(`remaining ${brokerOrder.remaining}`);
  if (brokerOrder.avgFillPrice != null) parts.push(`avg fill ${brokerOrder.avgFillPrice}`);
  if (brokerOrder.lastFillPrice != null) parts.push(`last fill ${brokerOrder.lastFillPrice}`);
  if (brokerOrder.execId) parts.push(`exec id ${brokerOrder.execId}`);
  if (brokerOrder.executedAt) parts.push(`executed at ${brokerOrder.executedAt}`);
  if (brokerOrder.completedStatus) parts.push(`completed status ${brokerOrder.completedStatus}`);
  return `Execution reconciliation: ${parts.join(', ')}`;
}

function appendReasonNote(existing, note, maxSegments = 3) {
  const cleanExisting = String(existing || '').trim();
  const cleanNote = String(note || '').trim();
  if (!cleanNote) return cleanExisting;
  if (!cleanExisting) return cleanNote;

  const segments = cleanExisting
    .split(/;\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.includes(cleanNote)) return cleanExisting;
  segments.push(cleanNote);

  const head = segments.filter((segment, idx) => idx === 0);
  const tail = segments.slice(1).slice(-Math.max(maxSegments - 1, 0));
  return [...head, ...tail].join('; ');
}

function numberText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return String(Number(n.toFixed(2)));
}

function rejectTradeProposal(tradesPath, selector, approval = 'user_rejected') {
  const table = readTradesTable(tradesPath);
  let updated = 0;

  table.rows.forEach((row, idx) => {
    if (!matchesTradeSelector(row, selector)) return;
    const status = String(row.Status || '').trim().toLowerCase();
    if (!['proposed', 'planned', 'approved'].includes(status)) return;

    const rowDate = String(row['Date/time'] || '').trim();
    const latestDate = latestPendingProposalDate(table.rows, row);
    if (['proposed', 'planned'].includes(status) && latestDate && rowDate !== latestDate) return;

    table.lines[table.rowIndexes[idx]] = formatTradeLine({
      ...row,
      Status: 'rejected',
      Approval: approval,
    });
    updated += 1;
  });

  if (updated > 0) fs.writeFileSync(tradesPath, table.lines.join('\n'));
  return { updated };
}


function listOpenBrokerOrderRows(tradesPath) {
  const table = readTradesTable(tradesPath);
  return table.rows
    .filter((row) => {
      const status = String(row.Status || '').trim().toLowerCase();
      const orderId = String(row['Broker order id'] || '').trim();
      return orderId && ['approved', 'submitted', 'partially_filled'].includes(status);
    })
    .map((row) => ({
      dateTime: row['Date/time'],
      tickerOrIsin: row['Ticker / ISIN'],
      action: row.Action,
      status: row.Status,
      brokerOrderId: row['Broker order id'],
    }));
}

module.exports = {
  readTradesTable,
  updateTradeRows,
  appendTradeEvent,
  listOpenBrokerOrderRows,
  markTradeApproved,
  rejectTradeProposal,
  reconcileOrderStatus,
  mapBrokerOrderStatus,
  appendReasonNote,
};
