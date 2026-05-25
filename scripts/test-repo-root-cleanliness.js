#!/usr/bin/env node
'use strict';

/* Phase S4 regression: the repo root stays scannable.
 *
 * - Every `phase-*.md` at the repo root must be an active stabilization plan
 *   (`phase-S*`) OR not present (moved to `archive/phase-plans/`).
 * - `docs/operations/repo-map.md` must exist.
 * - `archive/phase-plans/README.md` must exist (explains the move).
 * - The repo root markdown count stays under a sane ceiling so we notice if it
 *   relapses.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const ROOT_ENTRIES = fs.readdirSync(ROOT);
const ROOT_MARKDOWN = ROOT_ENTRIES.filter((f) => f.endsWith('.md'));

test('docs/operations/repo-map.md exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'docs/operations/repo-map.md')));
});

test('archive/phase-plans/README.md exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'archive/phase-plans/README.md')));
});

test('every root phase-*.md is a stabilization (phase-S*) plan', () => {
  const offenders = ROOT_MARKDOWN.filter((f) => /^phase-/i.test(f) && !/^phase-S\d/i.test(f));
  assert.deepStrictEqual(
    offenders,
    [],
    `expected every root phase-*.md to be a phase-S* stabilization plan; offenders: ${JSON.stringify(offenders)}`,
  );
});

test('root markdown count stays under 30', () => {
  assert(
    ROOT_MARKDOWN.length < 30,
    `repo root has ${ROOT_MARKDOWN.length} markdown files; archive historical docs to archive/phase-plans/ to keep this scannable`,
  );
});

test('archive/phase-plans/ contains the moved historical plans', () => {
  const archived = fs.readdirSync(path.join(ROOT, 'archive/phase-plans'))
    .filter((f) => f.endsWith('.md') && f !== 'README.md');
  assert(
    archived.length >= 50,
    `archive/phase-plans/ should contain the moved historical plans; found ${archived.length}`,
  );
});

test('no broken in-repo links to archived files in current docs', () => {
  // Sample a few canonical files that should never link into archived plans.
  const filesToScan = [
    'AGENTS.md',
    'PROGRESS_REPORT.md',
    'ROLLUP_OUTSTANDING_PLAN.md',
    'SPECIFICATION.md',
    'docs/operations/cron.md',
    'docs/operations/repo-map.md',
    'docs/operations/active-cron-jobs.md',
  ];
  for (const rel of filesToScan) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    // Match markdown links/refs that point at a top-level historical phase
    // path that no longer exists.
    const matches = text.match(/\]\((\.\/)?(phase-\d|phase-[1-9]-|consolidated-roadmap-checklist|master-plan-204|IMPLEMENTATION_PLAN|EXPANDED_)/g);
    if (matches) {
      // Allow archive/phase-plans/... prefixes; otherwise fail.
      const broken = matches.filter((m) => !/archive\/phase-plans/.test(m));
      assert.deepStrictEqual(broken, [], `${rel} contains stale links to archived plans: ${JSON.stringify(broken)}`);
    }
  }
});

console.log(JSON.stringify({ ok: true, passed, rootMarkdown: ROOT_MARKDOWN.length }));
