const fs = require('fs');

function fileFreshnessSummary({ dashboardPath, sourcePaths = [] }) {
  const existingSources = sourcePaths.filter((filePath) => filePath && fs.existsSync(filePath));
  const dashboardExists = dashboardPath && fs.existsSync(dashboardPath);
  const dashboardMtimeMs = dashboardExists ? fs.statSync(dashboardPath).mtimeMs : null;
  const sourceStats = existingSources.map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }));
  const newestSource = sourceStats.sort((a, b) => b.mtimeMs - a.mtimeMs)[0] || null;
  const stale = !dashboardExists || (newestSource && dashboardMtimeMs != null && newestSource.mtimeMs > dashboardMtimeMs);
  return {
    stale: Boolean(stale),
    dashboardExists,
    dashboardMtimeMs,
    newestSourcePath: newestSource ? newestSource.filePath : null,
    newestSourceMtimeMs: newestSource ? newestSource.mtimeMs : null,
  };
}

module.exports = { fileFreshnessSummary };
