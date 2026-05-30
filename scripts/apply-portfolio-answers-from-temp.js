#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function main() {
  const [, , portfolioPath, sourcePath] = process.argv;
  if (!portfolioPath) {
    console.error('Usage: node scripts/apply-portfolio-answers-from-temp.js <portfolio.md> [answers.json]');
    process.exit(1);
  }
  const inputPath = sourcePath || path.join(os.tmpdir(), 'answers.json');
  if (!fs.existsSync(inputPath)) {
    console.error(`Answers file not found: ${inputPath}`);
    process.exit(1);
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-portfolio-answers-'));
  const tempPath = path.join(tempDir, 'answers.json');
  fs.copyFileSync(inputPath, tempPath);

  const result = spawnSync(process.execPath, [path.join(__dirname, 'apply-portfolio-answers.js'), portfolioPath, tempPath], {
    stdio: 'inherit',
  });

  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  process.exit(result.status == null ? 1 : result.status);
}

main();
