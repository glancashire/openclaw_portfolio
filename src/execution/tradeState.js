const fs = require('fs');
const { normalizeLifecycleStatus } = require('./lifecycleStatus');
const { classifyTradeRowExecution } = require('./executionClassification');

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
  'Block code',
  'Block reason',
  'Blocked at',
  'Next action',
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
    'Block code': event.blockCode || '',
    'Block reason': event.blockReason || '',
    'Blocked at': event.blockedAt || '',
    'Next action': event.nextAction || '',
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

function markTradeApproved(tradesPath, selector, approval = 'user_approved', options = {}) {
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
      Reason: appendReasonNote(row.Reason, options.reasonNote || 'Operator approval recorded.'),
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
  const brokerBlock = classifyBrokerOrderBlock(brokerOrder, mappedStatus);
  return updateTradeRows(tradesPath, selector, (row) => ({
    ...row,
    Status: mappedStatus,
    Approval: approval,
    'Broker order id': brokerOrder.orderId != null ? String(brokerOrder.orderId) : row['Broker order id'],
    'Actual CHF': actualChf || row['Actual CHF'],
    'Block code': options.blockCode ?? brokerBlock.blockCode ?? row['Block code'] ?? '',
    'Block reason': options.blockReason ?? brokerBlock.blockReason ?? row['Block reason'] ?? '',
    'Next action': options.nextAction ?? brokerBlock.nextAction ?? row['Next action'] ?? '',
    Reason: appendReasonNote(row.Reason, options.reasonNote || buildBrokerReasonNote(brokerOrder, mappedStatus)),
  }));
}

function mapBrokerOrderStatus(status, brokerOrder = {}) {
  return normalizeLifecycleStatus(status, brokerOrder);
}

function inferApproval(status, brokerOrder = {}) {
  if (status === 'approved') return 'user_approved';
  if (status === 'staged') return 'staged_not_transmitted';
  if (status === 'submitted') return brokerOrder.transmit === false ? 'staged_not_transmitted' : 'submitted_to_broker';
  if (status === 'partially_filled' || status === 'filled') return 'broker_filled';
  if (status === 'cancelled') return brokerOrder.notFound === true ? 'broker_cancelled' : 'cancelled';
  if (status === 'inactive') return 'broker_inactive';
  if (status === 'failed') return brokerOrder.notFound === true ? 'not_found' : 'broker_failed';
  return 'user_approved';
}

function classifyBrokerOrderBlock(brokerOrder = {}, mappedStatus = '') {
  const status = String(mappedStatus || brokerOrder.status || '').trim().toLowerCase();
  const code = Number(brokerOrder.brokerErrorCode);
  const text = String(brokerOrder.brokerErrorMessage || brokerOrder.brokerReason || '').trim();
  const lower = text.toLowerCase();

  if (!['inactive', 'cancelled', 'failed'].includes(status)) {
    return { blockCode: '', blockReason: '', nextAction: '' };
  }

  if (code === 201 && /exchange is closed/.test(lower)) {
    return {
      blockCode: 'exchange_closed_at_submit',
      blockReason: 'Broker rejected the order because the target exchange was closed at submission time.',
      nextAction: 'Retry during the venue trading session or hand the row back to the market-open runner.',
    };
  }

  if (/exchange is closed/.test(lower) || /outside (regular )?trading hours/.test(lower)) {
    return {
      blockCode: 'exchange_closed_at_submit',
      blockReason: 'Broker rejected the order because the venue was not open for trading.',
      nextAction: 'Retry during the venue trading session or hand the row back to the market-open runner.',
    };
  }

  if (/contract|security definition|no security definition|ambiguous/.test(lower)) {
    return {
      blockCode: 'contract_resolution_failed',
      blockReason: 'Broker rejected the order because the contract identity or venue resolution was not accepted.',
      nextAction: 'Verify conid, symbol, exchange, and primary exchange before retrying.',
    };
  }

  if (/insufficient/.test(lower) || /buying power/.test(lower) || /cash/.test(lower)) {
    return {
      blockCode: 'insufficient_funds_or_buying_power',
      blockReason: 'Broker rejected the order because available cash or buying power was insufficient.',
      nextAction: 'Reduce size or restore buying power, then retry.',
    };
  }

  if (text) {
    return {
      blockCode: 'broker_submit_rejected',
      blockReason: `Broker rejected or inactivated the order: ${text}`,
      nextAction: 'Review the broker rejection reason and correct the order before retrying.',
    };
  }

  return { blockCode: '', blockReason: '', nextAction: '' };
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
  if (brokerOrder.brokerReason) parts.push(`broker reason ${brokerOrder.brokerReason}`);
  if (brokerOrder.brokerErrorCode != null) parts.push(`broker error code ${brokerOrder.brokerErrorCode}`);
  if (brokerOrder.brokerErrorMessage) parts.push(`broker error ${brokerOrder.brokerErrorMessage}`);
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

function rejectTradeProposal(tradesPath, selector, approval = 'user_rejected', options = {}) {
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
      Reason: appendReasonNote(row.Reason, options.reasonNote || 'Operator rejection recorded.'),
    });
    updated += 1;
  });

  if (updated > 0) fs.writeFileSync(tradesPath, table.lines.join('\n'));
  return { updated };
}


function listOpenBrokerOrderRows(tradesPath) {
  const table = readTradesTable(tradesPath);
  const latestByOrderId = new Map();

  table.rows.forEach((row) => {
    const status = String(row.Status || '').trim().toLowerCase();
    const orderId = String(row['Broker order id'] || '').trim();
    if (!orderId) return;
    if (!['staged', 'submitted', 'partially_filled'].includes(status)) return;
    if (String(row.Approval || '').trim() === 'cancelled') return;

    const current = latestByOrderId.get(orderId);
    const rowDate = String(row['Date/time'] || '').trim();
    const currentDate = current ? String(current['Date/time'] || '').trim() : '';
    if (!current || rowDate >= currentDate) latestByOrderId.set(orderId, row);
  });

  return Array.from(latestByOrderId.values()).map((row) => ({
    dateTime: row['Date/time'],
    tickerOrIsin: row['Ticker / ISIN'],
    action: row.Action,
    status: row.Status,
    brokerOrderId: row['Broker order id'],
    blockCode: row['Block code'] || '',
    blockReason: row['Block reason'] || '',
    nextAction: row['Next action'] || '',
  }));
}

function summarizeOpenRunnerRetryState(tradesPath) {
  const table = readTradesTable(tradesPath);
  const summary = {
    queuedInitial: 0,
    queuedRetry: 0,
  };
  table.rows.forEach((row) => {
    const approval = String(row.Approval || '').trim();
    const orderId = String(row['Broker order id'] || '').trim();
    if (approval !== 'queued_for_open_runner' || orderId) return;
    const blockCode = String(row['Block code'] || '').trim().toLowerCase();
    const nextAction = String(row['Next action'] || '').trim().toLowerCase();
    const retryableBlocked = Boolean(blockCode) || nextAction.includes('retry');
    if (retryableBlocked) summary.queuedRetry += 1;
    else summary.queuedInitial += 1;
  });
  return summary;
}

function queueTradeRowForOpenRunner(tradesPath, selector, options = {}) {
  const approval = options.approval || 'queued_for_open_runner';
  const reasonNote = options.reasonNote || 'Row queued for market-open runner.';
  const nextAction = options.nextAction || 'First open-runner attempt pending.';
  return updateTradeRows(tradesPath, selector, (row) => {
    const orderId = String(row['Broker order id'] || '').trim();
    if (orderId) return null;
    const status = String(row.Status || '').trim().toLowerCase();
    if (!['proposed', 'planned', 'approved'].includes(status)) return null;
    const existingNextAction = String(row['Next action'] || '').trim();
    return {
      ...row,
      Approval: approval,
      'Next action': existingNextAction || nextAction,
      Reason: appendReasonNote(row.Reason, reasonNote),
    };
  });
}

function requeueBlockedTradeRow(tradesPath, selector, options = {}) {
  const approval = options.approval || 'queued_for_open_runner';
  const reasonNote = options.reasonNote || 'Row requeued for market-open runner after operator review.';
  const nextAction = options.nextAction || 'Retry at next intended market-open run after operator recovery.';
  return updateTradeRows(tradesPath, selector, (row) => {
    const orderId = String(row['Broker order id'] || '').trim();
    if (orderId) return null;
    const blockCode = String(row['Block code'] || '').trim();
    if (!blockCode) return null;
    return {
      ...row,
      Status: ['proposed', 'planned', 'approved'].includes(String(row.Status || '').trim().toLowerCase()) ? row.Status : 'approved',
      Approval: approval,
      'Block code': '',
      'Block reason': '',
      'Blocked at': '',
      'Next action': nextAction,
      Reason: appendReasonNote(row.Reason, reasonNote),
    };
  });
}

function classifyExecutableRow(row, options = {}) {
  return classifyTradeRowExecution(row, options);
}

function listExecutableTradeRows(tradesPath, options = {}) {
  const table = readTradesTable(tradesPath);
  return table.rows.filter((row) => classifyExecutableRow(row, options).executable).map((row) => {
    const classification = classifyExecutableRow(row, options);
    return {
      dateTime: row['Date/time'],
      status: row.Status,
      action: row.Action,
      tickerOrIsin: row['Ticker / ISIN'],
      name: row.Name,
      quantity: Number(row.Quantity || 0),
      limitPrice: Number(row['Limit price'] || 0),
      estimatedChf: Number(row['Estimated CHF'] || 0),
      approval: row.Approval,
      brokerOrderId: row['Broker order id'],
      reason: row.Reason,
      blockCode: row['Block code'] || '',
      blockReason: row['Block reason'] || '',
      nextAction: row['Next action'] || '',
      canonicalState: classification.canonicalState,
      approvalAgeHours: classification.approvalAgeHours,
      staleApproval: classification.staleApproval,
    };
  });
}

module.exports = {
  readTradesTable,
  updateTradeRows,
  appendTradeEvent,
  listOpenBrokerOrderRows,
  listExecutableTradeRows,
  markTradeApproved,
  rejectTradeProposal,
  reconcileOrderStatus,
  mapBrokerOrderStatus,
  appendReasonNote,
  queueTradeRowForOpenRunner,
  requeueBlockedTradeRow,
  summarizeOpenRunnerRetryState,
  classifyBrokerOrderBlock,
  classifyExecutableRow,
};
