const assert = require('assert');
const fs = require('fs');
const path = require('path');

(function main() {
  const root = path.resolve(__dirname, '..', 'scripts');
  const moved = [
    'probe-market-data-subscriptions.js',
    'probe-six-subscription-detail.js',
    'probe-spmcha-raw.js',
    'probe-subscription-pattern.js',
  ];

  for (const name of moved) {
    const wrapperPath = path.join(root, name);
    const diagnosticPath = path.join(root, 'diagnostics', name);
    assert(fs.existsSync(wrapperPath), `missing wrapper script: ${name}`);
    assert(fs.existsSync(diagnosticPath), `missing diagnostics script: ${name}`);
    const wrapper = fs.readFileSync(wrapperPath, 'utf8');
    assert(wrapper.includes(`./diagnostics/${name.replace(/\.js$/, '')}`), `wrapper for ${name} should forward to diagnostics path`);
  }

  console.log(JSON.stringify({ ok: true, moved }, null, 2));
})();
