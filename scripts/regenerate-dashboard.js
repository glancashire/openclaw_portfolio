#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');

const REPO_ROOT = path.resolve(__dirname, '..');

function listAvailablePortfolios() {
  const portfolioRoot = path.join(REPO_ROOT, 'portfolio');
  if (!fs.existsSync(portfolioRoot)) return [];
  return fs.readdirSync(portfolioRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function resolvePortfolioDir(rawArg) {
  if (!rawArg) {
    return { error: 'missing-arg' };
  }
  const arg = String(rawArg).trim();
  if (!arg) {
    return { error: 'missing-arg' };
  }

  // 1. If the argument is a path that exists and is a directory, use it.
  const candidatePath = path.isAbsolute(arg) ? arg : path.join(REPO_ROOT, arg);
  if (fs.existsSync(candidatePath)) {
    const stat = fs.statSync(candidatePath);
    if (stat.isDirectory()) {
      return { dir: candidatePath };
    }
  }

  // 2. Bare-name fallback: resolve against <repoRoot>/portfolio/<name>.
  if (!arg.includes('/') && !arg.includes(path.sep)) {
    const byName = path.join(REPO_ROOT, 'portfolio', arg);
    if (fs.existsSync(byName) && fs.statSync(byName).isDirectory()) {
      return { dir: byName };
    }
  }

  return {
    error: 'unknown-portfolio',
    arg,
    candidates: listAvailablePortfolios(),
  };
}

async function main() {
  const resolved = resolvePortfolioDir(process.argv[2]);
  if (resolved.error === 'missing-arg') {
    const candidates = listAvailablePortfolios();
    console.error('Usage: node scripts/regenerate-dashboard.js <portfolio-name-or-dir>');
    if (candidates.length) {
      console.error(`Known portfolios: ${candidates.join(', ')}`);
    }
    process.exit(1);
  }
  if (resolved.error === 'unknown-portfolio') {
    console.error(`Unknown portfolio: ${resolved.arg}`);
    if (resolved.candidates.length) {
      console.error(`Known portfolios: ${resolved.candidates.join(', ')}`);
    } else {
      console.error('No portfolios discovered under portfolio/.');
    }
    process.exit(1);
  }

  const out = await regenerateDashboard(resolved.dir);
  console.log(JSON.stringify({ dashboard: out, portfolioDir: resolved.dir }, null, 2));
}

module.exports = { resolvePortfolioDir, listAvailablePortfolios };

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  });
}
