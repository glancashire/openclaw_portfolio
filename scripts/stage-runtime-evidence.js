const { execFileSync } = require('child_process');
const { listRuntimeEvidencePaths } = require('../src/reporting/runtimeEvidence');

function main() {
  const paths = listRuntimeEvidencePaths();
  execFileSync('git', ['add', '-f', '--', ...paths], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  console.log(JSON.stringify({ ok: true, stagedCount: paths.length, paths }, null, 2));
}

main();
