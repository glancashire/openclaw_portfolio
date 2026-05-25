#!/usr/bin/env node
'use strict';

/* Guard: every script in scripts/diagnostics/ must use the correct relative
 * require paths so it can be invoked from the repo root without crashing on
 * MODULE_NOT_FOUND.
 *
 * Today (2026-05-25) we have already shipped two diagnostic scripts whose
 * require('../X') paths were one level off because the original drafts
 * assumed scripts/ as their parent (one level above src/) instead of
 * scripts/diagnostics/ (two levels above src/). The bug is invisible
 * because diagnostic scripts only run on demand. This test makes the bug
 * loud at test time.
 *
 * Strategy: parse each script as JS, extract every top-level static require
 * literal, resolve it, and fail if any path resolves outside the workspace
 * or fails to resolve.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIAG_DIR = path.join(ROOT, 'scripts', 'diagnostics');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function extractRequires(src) {
  // Match require('...') or require("...") with a literal string. Ignore
  // dynamic requires (which diagnostics scripts should never use).
  const out = [];
  const re = /require\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push(m[2]);
  }
  return out;
}

function listDiagnosticScripts() {
  if (!fs.existsSync(DIAG_DIR)) return [];
  return fs.readdirSync(DIAG_DIR)
    .filter((n) => n.endsWith('.js'))
    .map((n) => path.join(DIAG_DIR, n));
}

const scripts = listDiagnosticScripts();

test('scripts/diagnostics directory exists and contains at least one script', () => {
  assert(scripts.length > 0, 'expected at least one diagnostic script');
});

for (const scriptPath of scripts) {
  const rel = path.relative(ROOT, scriptPath);
  test(`require paths resolve in ${rel}`, () => {
    const src = fs.readFileSync(scriptPath, 'utf8');
    const requires = extractRequires(src);
    for (const req of requires) {
      // Built-ins and bare-package requires are fine.
      if (!req.startsWith('.') && !req.startsWith('/')) continue;
      // Resolve relative to the script's directory.
      const resolved = path.resolve(path.dirname(scriptPath), req);
      // Allow with or without .js / index.js
      const candidates = [
        resolved,
        `${resolved}.js`,
        path.join(resolved, 'index.js'),
      ];
      const exists = candidates.some((c) => fs.existsSync(c));
      assert(
        exists,
        `${rel}: require(${JSON.stringify(req)}) does not resolve. Tried: ${candidates.join(', ')}`,
      );
      // Must stay inside the workspace.
      assert(
        resolved.startsWith(ROOT),
        `${rel}: require(${JSON.stringify(req)}) escapes the workspace root: ${resolved}`,
      );
    }
  });
}

console.log(JSON.stringify({ ok: true, passed, scripts: scripts.length }));
