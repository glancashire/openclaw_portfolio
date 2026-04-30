const fs = require('fs');
const path = require('path');

async function main() {
  const htmlPath = process.argv[2];
  const pdfPath = process.argv[3];
  if (!htmlPath || !pdfPath) {
    throw new Error('Usage: node scripts/render-html-pdf.js <input.html> <output.pdf>');
  }

  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    throw new Error('playwright not installed');
  }

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${path.resolve(htmlPath)}`, { waitUntil: 'load' });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '16mm', right: '12mm', bottom: '16mm', left: '12mm' } });
  } finally {
    await browser.close();
  }

  if (!fs.existsSync(pdfPath)) throw new Error('PDF render failed');
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
