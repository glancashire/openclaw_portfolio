#!/usr/bin/env node
'use strict';

/* Phase Cleanup-1A regression: generated artifacts stay out of git.
 *
 * Locks the .gitignore policy decisions made on 2026-06-01:
 * - portfolio/<name>/reports/{monthly,weekly,quarterly}/*.{html,json,pdf}
 *   are derivative; only .md is tracked.
 * - runtime/events/runtime-events.jsonl was tracked before runtime/ was
 *   ignored; must stay explicitly untracked.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const GITIGNORE = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');

function gitignoreHas(line) {
  return GITIGNORE.split('\n').some((l) => l.trim() === line);
}

function lsFiles(glob) {
  try {
    const out = execSync(`git ls-files -- ${glob}`, { cwd: ROOT, encoding: 'utf8' });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

test('.gitignore lists report-derivative globs', () => {
  for (const cadence of ['monthly', 'weekly', 'quarterly']) {
    for (const ext of ['html', 'json', 'pdf']) {
      const line = `portfolio/*/reports/${cadence}/*.${ext}`;
      assert(
        gitignoreHas(line),
        `Expected .gitignore to contain '${line}'. Add it back to keep generated report derivatives out of git.`,
      );
    }
  }
});

test('.gitignore explicitly ignores runtime-events.jsonl', () => {
  assert(
    gitignoreHas('runtime/events/runtime-events.jsonl'),
    "Expected .gitignore to contain 'runtime/events/runtime-events.jsonl' (file was tracked before runtime/ was ignored).",
  );
});

test('no tracked report derivatives in any portfolio', () => {
  for (const cadence of ['monthly', 'weekly', 'quarterly']) {
    for (const ext of ['html', 'json', 'pdf']) {
      const tracked = lsFiles(`'portfolio/*/reports/${cadence}/*.${ext}'`);
      assert.deepStrictEqual(
        tracked,
        [],
        `Expected no tracked portfolio/*/reports/${cadence}/*.${ext} files; found ${JSON.stringify(tracked)}.`,
      );
    }
  }
});

test('runtime-events.jsonl is not tracked', () => {
  const tracked = lsFiles('runtime/events/runtime-events.jsonl');
  assert.deepStrictEqual(
    tracked,
    [],
    `Expected runtime/events/runtime-events.jsonl to be untracked; git ls-files returned ${JSON.stringify(tracked)}.`,
  );
});

test('canonical .md monthly reports remain tracked', () => {
  const tracked = lsFiles("'portfolio/*/reports/monthly/*.md'");
  assert(
    tracked.length > 0,
    'Expected at least one tracked portfolio/*/reports/monthly/*.md file (the .md is the canonical report; only derivatives are ignored).',
  );
});

console.log(JSON.stringify({ ok: true, passed }, null, 2));
