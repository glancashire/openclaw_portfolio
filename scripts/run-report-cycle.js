const { generateAndWriteReport } = require('../src/reporting/reportGenerator');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');
const { appendHistorySnapshot } = require('../src/analysis/historyWriter');
const path = require('path');

function stepOk(name, extra = {}) {
  return { name, ok: true, ...extra };
}

function stepFailed(name, error, extra = {}) {
  return {
    name,
    ok: false,
    error: error?.message || String(error),
    ...extra,
  };
}

async function runReportCycle({ portfolioDir, period, dateStamp }) {
  const workflow = [];
  const historyPath = path.join(portfolioDir, 'history.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');

  let historyAppend;
  try {
    historyAppend = appendHistorySnapshot(historyPath, holdingsPath, 'end_of_day', `${period} report cycle snapshot`);
    workflow.push(stepOk('append_history_snapshot', { appended: historyAppend.appended, snapshot: historyAppend.snapshot }));
  } catch (error) {
    workflow.push(stepFailed('append_history_snapshot', error, { resumable: false }));
    throw Object.assign(error, { workflow, failedStep: 'append_history_snapshot', mode: 'read_only_reporting' });
  }

  let dashboardPath;
  try {
    dashboardPath = await regenerateDashboard(portfolioDir);
    workflow.push(stepOk('regenerate_dashboard', { dashboardPath }));
  } catch (error) {
    workflow.push(stepFailed('regenerate_dashboard', error, { resumable: true }));
    throw Object.assign(error, { workflow, failedStep: 'regenerate_dashboard', mode: 'read_only_reporting' });
  }

  let report;
  try {
    report = await generateAndWriteReport({ portfolioDir, period, dateStamp });
    workflow.push(stepOk('generate_report', {
      markdownPath: report.markdownPath,
      pdfMode: report.pdfMode,
      renderWarning: report.generationMeta?.renderWarning || null,
    }));
  } catch (error) {
    workflow.push(stepFailed('generate_report', error, { resumable: true }));
    throw Object.assign(error, { workflow, failedStep: 'generate_report', mode: 'read_only_reporting' });
  }

  return {
    ok: true,
    mode: 'read_only_reporting',
    historyAppend,
    dashboardPath,
    workflow,
    ...report,
  };
}

async function main() {
  const portfolioDir = process.argv[2];
  const period = process.argv[3];
  const dateStamp = process.argv[4] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

  if (!portfolioDir || !period) {
    console.error('Usage: node scripts/run-report-cycle.js <portfolio-dir> <weekly|monthly|quarterly> [YYYYMMDD]');
    process.exit(1);
  }

  try {
    const result = await runReportCycle({ portfolioDir, period, dateStamp });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.log(JSON.stringify({
      ok: false,
      mode: err.mode || 'read_only_reporting',
      failedStep: err.failedStep || 'unknown',
      error: err.message || String(err),
      workflow: err.workflow || [],
    }, null, 2));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runReportCycle };
