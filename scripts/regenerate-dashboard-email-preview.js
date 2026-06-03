#!/usr/bin/env node
/**
 * Regenerate the dashboard digest HTML/text preview without sending any email.
 *
 * Usage:
 *   node scripts/regenerate-dashboard-email-preview.js [portfolio]   # default: etf
 *
 * Writes:
 *   runtime/dashboard-email-phase7-preview.html
 *   runtime/dashboard-email-phase7-preview.txt
 *
 * Used after redesigning the email theme so reviewers can open the artifact
 * directly in Apple Mail / Gmail to eye-check light + dark.
 */

const fs = require('fs');
const path = require('path');
const { buildDashboardDigest } = require('../src/reporting/dashboardDigest');

async function main() {
  const portfolioName = process.argv[2] || 'etf';
  const repoRoot = path.resolve(__dirname, '..');
  const portfolioDir = path.join(repoRoot, 'portfolio', portfolioName);
  if (!fs.existsSync(portfolioDir)) {
    console.error(`Portfolio not found: ${portfolioDir}`);
    process.exit(1);
  }
  // Use a stub model client to avoid any LLM round-trips.
  const noopModelClient = {
    complete: async () => ({ content: [{ text: '' }] }),
  };
  const digest = await buildDashboardDigest({
    portfolioDir,
    frequency: 'daily',
    generatedAt: new Date().toISOString(),
    modelClient: noopModelClient,
  });
  const outDir = path.join(repoRoot, 'runtime');
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, 'dashboard-email-phase7-preview.html');
  const textPath = path.join(outDir, 'dashboard-email-phase7-preview.txt');
  fs.writeFileSync(htmlPath, digest.html);
  fs.writeFileSync(textPath, digest.text);
  console.log(JSON.stringify({
    ok: true,
    portfolio: portfolioName,
    htmlPath,
    htmlBytes: digest.html.length,
    textPath,
    textBytes: digest.text.length,
    subject: digest.subject,
  }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
