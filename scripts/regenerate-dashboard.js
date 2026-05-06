const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/regenerate-dashboard.js <portfolio-dir>');
    process.exit(1);
  }

  const out = await regenerateDashboard(target);
  console.log(JSON.stringify({ dashboard: out }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
