const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/regenerate-dashboard.js <portfolio-dir>');
  process.exit(1);
}

const out = regenerateDashboard(target);
console.log(JSON.stringify({ dashboard: out }, null, 2));
