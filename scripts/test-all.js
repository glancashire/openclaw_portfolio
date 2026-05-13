'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const includeDirs = ['scripts', 'tests'];
const skip = new Set([
  'scripts/test-all.js',
  'scripts/test-mailgun.js',
  'scripts/test-trade-notification-email.js',
  'scripts/test-monitor-fills-real-orders.js',
  'scripts/test-interactive-brokers-auth.js',
  'scripts/test-interactive-brokers-native-socket.js',
]);

function collect() {
  const found = [];
  for (const dir of includeDirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const entry of fs.readdirSync(fullDir).sort()) {
      if (!/^test-.*\.js$/.test(entry)) continue;
      const rel = path.join(dir, entry);
      if (skip.has(rel)) continue;
      found.push(rel);
    }
  }
  return found;
}

function main() {
  const files = collect();
  const results = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    process.stdout.write(`\n==> ${rel}\n`);
    execFileSync(process.execPath, [abs], { cwd: ROOT, stdio: 'inherit' });
    results.push(rel);
  }
  console.log(JSON.stringify({ ok: true, count: results.length, files: results }, null, 2));
}

main();
