#!/usr/bin/env node
'use strict';

/* Phase Cleanup-1B regression: regenerate-dashboard CLI accepts both
 * bare portfolio names and directory paths.
 */

const assert = require('assert');
const path = require('path');
const { resolvePortfolioDir, listAvailablePortfolios } = require('./regenerate-dashboard');

const REPO_ROOT = path.resolve(__dirname, '..');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const candidates = listAvailablePortfolios();
assert(candidates.includes('etf'), 'fixture sanity: portfolio/etf should exist');

test('bare portfolio name resolves to portfolio/<name>', () => {
  const resolved = resolvePortfolioDir('etf');
  assert.strictEqual(resolved.error, undefined, `unexpected error: ${JSON.stringify(resolved)}`);
  assert.strictEqual(resolved.dir, path.join(REPO_ROOT, 'portfolio', 'etf'));
});

test('relative directory path resolves correctly', () => {
  const resolved = resolvePortfolioDir('portfolio/etf');
  assert.strictEqual(resolved.error, undefined);
  assert.strictEqual(resolved.dir, path.join(REPO_ROOT, 'portfolio', 'etf'));
});

test('absolute directory path resolves correctly', () => {
  const abs = path.join(REPO_ROOT, 'portfolio', 'etf');
  const resolved = resolvePortfolioDir(abs);
  assert.strictEqual(resolved.error, undefined);
  assert.strictEqual(resolved.dir, abs);
});

test('unknown portfolio name returns helpful error with candidates', () => {
  const resolved = resolvePortfolioDir('does-not-exist-xyz');
  assert.strictEqual(resolved.error, 'unknown-portfolio');
  assert.strictEqual(resolved.arg, 'does-not-exist-xyz');
  assert(Array.isArray(resolved.candidates));
  assert(resolved.candidates.includes('etf'));
});

test('missing arg returns missing-arg error', () => {
  const resolved = resolvePortfolioDir();
  assert.strictEqual(resolved.error, 'missing-arg');
  const empty = resolvePortfolioDir('');
  assert.strictEqual(empty.error, 'missing-arg');
  const whitespace = resolvePortfolioDir('   ');
  assert.strictEqual(whitespace.error, 'missing-arg');
});

test('listAvailablePortfolios returns directories under portfolio/', () => {
  const list = listAvailablePortfolios();
  assert(Array.isArray(list));
  assert(list.length > 0, 'expected at least one portfolio directory');
  assert(list.includes('etf'));
});

console.log(JSON.stringify({ ok: true, passed }, null, 2));
