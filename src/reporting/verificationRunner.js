const { execFileSync } = require('child_process');

function formatDurationMs(durationMs) {
  if (durationMs < 1000) return `${durationMs}ms`;
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

function runNamedNodeCheck({ name, args, cwd, stdio = 'inherit' }) {
  const startedAt = Date.now();
  console.log(`[verify] START ${name}`);
  execFileSync(process.execPath, args, {
    cwd,
    stdio,
    encoding: 'utf8',
  });
  const durationMs = Date.now() - startedAt;
  console.log(`[verify] DONE  ${name} (${formatDurationMs(durationMs)})`);
  return { name, ok: true, durationMs };
}

function summarizeResults(results) {
  const totalDurationMs = results.reduce((sum, item) => sum + (item.durationMs || 0), 0);
  return {
    ok: true,
    checkCount: results.length,
    totalDurationMs,
    totalDuration: formatDurationMs(totalDurationMs),
    checks: results.map(({ name, durationMs, ok, script }) => ({
      name: name || script,
      ok,
      durationMs,
      duration: formatDurationMs(durationMs || 0),
    })),
  };
}

module.exports = {
  formatDurationMs,
  runNamedNodeCheck,
  summarizeResults,
};
