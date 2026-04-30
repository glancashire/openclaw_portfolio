const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  const username = process.env.IBKR_USERNAME;
  const password = process.env.IBKR_PASSWORD;
  if (!username || !password) throw new Error('Missing creds');

  await page.goto('https://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#xyz-field-username', username);
  await page.fill('#xyz-field-password', password);
  await page.locator('form.xyzform-username button[type="submit"]').click();
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const body = document.body.innerText;
    const labels = [...document.querySelectorAll('label, p, div, span, strong, h1, h2, h3, h4')]
      .map((el) => ({ text: (el.innerText || el.textContent || '').trim(), className: el.className || null, id: el.id || null }))
      .filter((x) => x.text);
    const imgs = [...document.querySelectorAll('img')].map((img) => ({
      alt: img.getAttribute('alt'),
      src: img.getAttribute('src'),
      width: img.getAttribute('width'),
      height: img.getAttribute('height'),
      className: img.className || null,
      id: img.id || null,
    }));
    const inputs = [...document.querySelectorAll('input')].map((el) => ({
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.getAttribute('placeholder'),
      value: el.getAttribute('value'),
      className: el.className || null,
      visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
    }));
    return { url: location.href, title: document.title, body, labels, imgs, inputs };
  });

  await page.screenshot({ path: 'tmp/ibkr-challenge.png', fullPage: true });
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
