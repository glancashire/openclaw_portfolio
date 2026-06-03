/**
 * Asserts the OpenClaw host contract matrix exists and contains its named rows.
 *
 * The test does not validate the contract content itself; it locks in the
 * surface so onboarding and search keep working as the doc evolves.
 *
 * Owning doc: docs/operations/openclaw-host-contract.md
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

(function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const contractPath = path.join(repoRoot, 'docs', 'operations', 'openclaw-host-contract.md');
  assert(fs.existsSync(contractPath), 'docs/operations/openclaw-host-contract.md must exist');
  const text = fs.readFileSync(contractPath, 'utf8');

  // Required structural anchors
  assert(text.includes('# OpenClaw host contract'), 'top-level heading present');
  assert(text.includes('## Contract matrix'), 'contract matrix section present');

  // Required rows in the matrix (must appear bolded in the table cell)
  const requiredRows = [
    '**Channels**',
    '**Sandbox**',
    '**Cron delivery**',
    '**Restarts**',
    '**Approvals**',
  ];
  for (const row of requiredRows) {
    assert(text.includes(row), `contract matrix must include row: ${row}`);
  }

  // Cross-link discipline: each pointer doc named in this file must exist.
  const requiredPointers = [
    'docs/operations/cron.md',
    'docs/operations/active-cron-jobs.md',
    'docs/operations/wrappers-and-shims.md',
    'docs/setup/approval-gate.md',
  ];
  for (const rel of requiredPointers) {
    assert(text.includes(rel), `host contract must reference ${rel}`);
    assert(fs.existsSync(path.join(repoRoot, rel)), `referenced doc must exist on disk: ${rel}`);
  }

  // Top-level pointers from other operator surfaces.
  const expectPointer = (file) => {
    const p = path.join(repoRoot, file);
    assert(fs.existsSync(p), `${file} must exist`);
    const t = fs.readFileSync(p, 'utf8');
    assert(
      t.includes('docs/operations/openclaw-host-contract.md') ||
      t.includes('openclaw-host-contract'),
      `${file} must point at the host contract`
    );
  };
  expectPointer('TOOLS.md');
  expectPointer('AGENTS.md');
  expectPointer('playbook.md');
  expectPointer('docs/operations/repo-map.md');

  console.log(JSON.stringify({ ok: true, rows: requiredRows.length, pointers: requiredPointers.length }, null, 2));
})();
