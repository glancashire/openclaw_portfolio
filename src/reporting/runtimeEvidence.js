const RUNTIME_EVIDENCE_PATHS = [
  'runtime/overview/approvals-queue.html',
  'runtime/overview/approvals-queue.json',
  'runtime/overview/approvals-queue.md',
  'runtime/overview/daily-summary.json',
  'runtime/overview/delivery-status.html',
  'runtime/overview/delivery-status.json',
  'runtime/overview/delivery-status.md',
  'runtime/overview/index.html',
  'runtime/overview/pending-actions.json',
  'runtime/overview/portfolio-index.json',
  'runtime/overview/portfolio-overview.html',
  'runtime/overview/portfolio-overview.md',
  'runtime/overview/report-history.html',
  'runtime/overview/report-history.json',
  'runtime/overview/report-history.md',
  'runtime/ibkr/native-gateway-keepalive-state.json',
];

function listRuntimeEvidencePaths() {
  return [...RUNTIME_EVIDENCE_PATHS];
}

module.exports = {
  RUNTIME_EVIDENCE_PATHS,
  listRuntimeEvidencePaths,
};
