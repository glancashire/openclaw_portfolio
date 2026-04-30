const { chromium } = require('playwright');
const { loadInteractiveBrokersConfig } = require('../src/brokers/interactive-brokers/config');

async function main() {
  const code = process.env.IBKR_2FA;
  if (!code) throw new Error('Set IBKR_2FA');
  const config = loadInteractiveBrokersConfig();

  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await page.goto('https://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#xyz-field-username', config.username);
  await page.fill('#xyz-field-password', config.password);
  await page.locator('form.xyzform-username button[type="submit"]').click();
  await page.locator('#xyz-field-silver-response').waitFor({ state: 'visible', timeout: 15000 });
  await page.fill('#xyz-field-silver-response', code);
  await page.locator('form.xyzform-silver button[type="submit"]').last().click();
  await page.waitForTimeout(2500);

  const pageState = {
    url: page.url(),
    title: await page.title(),
    body: (await page.locator('body').innerText()).slice(0, 2000),
  };

  const auth = await context.request.get('https://localhost:5000/portal.proxy/v1/portal/iserver/auth/status', { failOnStatusCode: false });
  const tickle = await context.request.get('https://localhost:5000/portal.proxy/v1/portal/tickle', { failOnStatusCode: false });

  console.log(JSON.stringify({
    pageState,
    auth: { status: auth.status(), text: await auth.text() },
    tickle: { status: tickle.status(), text: await tickle.text() },
  }, null, 2));

  await browser.close();
}

main().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
