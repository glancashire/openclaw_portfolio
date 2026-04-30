const { chromium } = require('playwright');

async function fetchJson(page, url) {
  return page.evaluate(async (u) => {
    const res = await fetch(u, { credentials: 'include' });
    const text = await res.text();
    return { status: res.status, text };
  }, url);
}

async function main() {
  const username = process.env.IBKR_USERNAME;
  const password = process.env.IBKR_PASSWORD;
  const code = process.env.IBKR_2FA;
  if (!username || !password || !code) throw new Error('Missing IBKR_USERNAME/IBKR_PASSWORD/IBKR_2FA');

  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const seen = [];
  page.on('request', (req) => seen.push(['REQ', req.method(), req.url()]));
  page.on('response', (res) => seen.push(['RES', res.status(), res.url()]));

  await page.goto('https://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#xyz-field-username', username);
  await page.fill('#xyz-field-password', password);
  await page.locator('form.xyzform-username button[type="submit"]').click();
  await page.locator('#xyz-field-silver-response').waitFor({ state: 'visible', timeout: 15000 });
  await page.fill('#xyz-field-silver-response', code);
  await page.locator('form.xyzform-silver button[type="submit"]').last().click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const current = {
    url: page.url(),
    title: await page.title(),
    body: (await page.locator('body').innerText()).slice(0, 4000),
  };

  const cookies = await context.cookies();
  const validate = await fetchJson(page, 'https://localhost:5000/v1/api/sso/validate?gw=1').catch((e) => ({ error: e.message }));
  const tickle = await fetchJson(page, 'https://localhost:5000/v1/api/tickle').catch((e) => ({ error: e.message }));
  const auth = await fetchJson(page, 'https://localhost:5000/v1/api/iserver/auth/status').catch((e) => ({ error: e.message }));

  console.log(JSON.stringify({
    current,
    cookies,
    validate,
    tickle,
    auth,
    recentNetwork: seen.slice(-60),
  }, null, 2));

  await page.screenshot({ path: 'tmp/ibkr-bootstrap-state.png', fullPage: true });
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
