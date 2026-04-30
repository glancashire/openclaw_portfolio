const { chromium } = require('playwright');

async function main() {
  const username = process.env.IBKR_USERNAME;
  const password = process.env.IBKR_PASSWORD;
  const code = process.env.IBKR_2FA;
  if (!username || !password || !code) throw new Error('Missing IBKR_USERNAME/IBKR_PASSWORD/IBKR_2FA');

  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  await page.goto('https://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#xyz-field-username', username);
  await page.fill('#xyz-field-password', password);
  await page.locator('form.xyzform-username button[type="submit"]').click();
  await page.waitForTimeout(1500);

  const silver = page.locator('#xyz-field-silver-response');
  await silver.waitFor({ state: 'visible', timeout: 15000 });
  await silver.fill(code);
  await page.locator('form.xyzform-silver button[type="submit"]').last().click();
  await page.waitForTimeout(5000);

  console.log(JSON.stringify({
    url: page.url(),
    title: await page.title(),
    body: (await page.locator('body').innerText()).slice(0, 5000),
  }, null, 2));

  await page.screenshot({ path: 'tmp/ibkr-after-app-code.png', fullPage: true });
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
