const { chromium } = require('playwright');
const { loadInteractiveBrokersConfig } = require('../src/brokers/interactive-brokers/config');

async function main() {
  const config = loadInteractiveBrokersConfig();
  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await page.goto('https://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#xyz-field-username', config.username);
  await page.fill('#xyz-field-password', config.password);
  await page.locator('form.xyzform-username button[type="submit"]').click();
  await page.waitForTimeout(3000);

  const details = await page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    const summarize = (el) => {
      if (!el) return null;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.innerText || el.textContent || '').trim().slice(0, 500),
        className: el.className || null,
        id: el.id || null,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        placeholder: el.getAttribute('placeholder'),
        value: 'value' in el ? String(el.value || '') : null,
        disabled: 'disabled' in el ? Boolean(el.disabled) : null,
        visible: visible(el),
        display: style.display,
        visibility: style.visibility,
        width: rect.width,
        height: rect.height,
      };
    };

    const selectors = [
      '.text-lightgray',
      '.xyz-field-silver-response-label',
      '.xyz-silver-response',
      '.xyz-otp-select-text',
      '.xyz-otp-select-voice',
      '.xyz-otp-select-email',
      '.xyz-otp-cancel',
      '.xyz-resend-sms-button',
      'form.xyzform-silver',
      'form.xyzform-bronze',
      'form.xyzform-fido',
      'form.xyzform-temp'
    ];

    const result = {};
    for (const sel of selectors) {
      result[sel] = [...document.querySelectorAll(sel)].map(summarize);
    }

    result.body = (document.body.innerText || '').slice(0, 4000);
    result.url = location.href;
    result.title = document.title;
    return result;
  });

  console.log(JSON.stringify(details, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
