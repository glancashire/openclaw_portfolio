const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

(function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'email-verify-guard-'));
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({ deliveryMode: 'local_only', externalDeliveryEnabled: false, emailProvider: 'mailgun', emailRecipients: [] }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');

  const blocked = spawnSync('node', ['scripts/send-email-verification.js', portfolioDir], { cwd: process.cwd(), encoding: 'utf8' });
  assert.strictEqual(blocked.status, 2, `expected exit 2, got ${blocked.status} stderr=${blocked.stderr}`);
  assert(/disabled by policy/i.test(blocked.stderr), `expected disabled-by-policy message, got: ${blocked.stderr}`);

  const allowed = spawnSync('node', ['scripts/send-email-verification.js', portfolioDir, '--to', 'lancashire@swift.ch'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, MAILGUN_API_KEY: 'test-key', MAILGUN_DOMAIN: 'mailgun.example.com', MAILGUN_SENDER: 'bot@mailgun.example.com' },
  });
  assert.notStrictEqual(allowed.status, 2, 'explicit recipient override should bypass policy-mode block for verification');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
