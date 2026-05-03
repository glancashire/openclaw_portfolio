const fs = require('fs');

const EXECUTION_SNAPSHOT_TYPES = new Set([
  'execution_approved',
  'execution_staged',
  'execution_submitted',
  'execution_partially_filled',
  'execution_filled',
  'execution_cancelled',
  'execution_failed',
  'execution_not_found',
  'execution_status',
]);

function parseHoldingSummary(text) {
  const get = (label) => {
    const m = text.match(new RegExp(`- ${label}:\\s*(.+)`));
    return m ? m[1].trim() : '0';
  };
  return {
    total: get('Total value CHF'),
    invested: get('Invested value CHF'),
    cash: get('Cash CHF'),
  };
}

function appendHistorySnapshot(historyPath, holdingsPath, snapshot = 'end_of_day', notes = '', options = {}) {
  const holdingsText = fs.readFileSync(holdingsPath, 'utf8');
  const summary = parseHoldingSummary(holdingsText);
  const date = new Date().toISOString().slice(0, 10);
  const normalizedSnapshot = normalizeSnapshotType(snapshot, notes, options);
  const row = `| ${date} | ${normalizedSnapshot} | ${summary.total} | ${summary.invested} | ${summary.cash} | 0 | 0 | ${notes} |`;

  let text = fs.readFileSync(historyPath, 'utf8').trimEnd();
  const lines = text.split(/\r?\n/);
  const duplicate = lines.find((line) => line.trim() === row.trim());
  if (duplicate) {
    return { appended: false, row, duplicate: true, snapshot: normalizedSnapshot };
  }
  text += `\n${row}\n`;
  fs.writeFileSync(historyPath, text);
  return { appended: true, row, snapshot: normalizedSnapshot };
}

function normalizeSnapshotType(snapshot, notes = '', options = {}) {
  const explicit = String(snapshot || '').trim();
  if (explicit && explicit !== 'execution_status') return explicit;
  const status = String(options.executionStatus || '').trim().toLowerCase();
  if (status) {
    if (status === 'approved') return 'execution_approved';
    if (status === 'submitted' || status === 'presubmitted') return 'execution_submitted';
    if (status === 'partially_filled') return 'execution_partially_filled';
    if (status === 'filled') return 'execution_filled';
    if (status === 'cancelled' || status === 'canceled') return 'execution_cancelled';
    if (status === 'failed' || status === 'rejected' || status === 'inactive') return 'execution_failed';
    if (status === 'not_found') return 'execution_not_found';
  }
  const text = String(notes || '').toLowerCase();
  if (text.includes('not_found')) return 'execution_not_found';
  if (text.includes('cancel')) return 'execution_cancelled';
  if (text.includes('partial')) return 'execution_partially_filled';
  if (text.includes('filled')) return 'execution_filled';
  if (text.includes('fail') || text.includes('reject')) return 'execution_failed';
  return EXECUTION_SNAPSHOT_TYPES.has(explicit) ? explicit : 'execution_status';
}

module.exports = { appendHistorySnapshot, normalizeSnapshotType };
