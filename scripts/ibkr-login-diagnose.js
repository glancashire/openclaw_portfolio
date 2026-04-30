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

  const state = await page.evaluate(() => {
    const infoFor = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        exists: true,
        display: style.display,
        visibility: style.visibility,
        width: rect.width,
        height: rect.height,
        disabled: 'disabled' in el ? Boolean(el.disabled) : null,
        value: 'value' in el ? String(el.value || '') : null,
        text: (el.innerText || el.textContent || '').trim().slice(0, 300),
        className: el.className || null,
      };
    };

    const text = document.body.innerText || '';
    return {
      url: location.href,
      title: document.title,
      body: text.slice(0, 4000),
      controls: {
        usernameForm: infoFor('form.xyzform-username'),
        silverForm: infoFor('form.xyzform-silver'),
        silverInput: infoFor('#xyz-field-silver-response'),
        silverSubmit: infoFor('form.xyzform-silver button[type="submit"]'),
        silverSms: infoFor('form.xyzform-silver button[type="button"]'),
        otpText: infoFor('.xyz-otp-select-text'),
        otpVoice: infoFor('.xyz-otp-select-voice'),
        otpEmail: infoFor('.xyz-otp-select-email'),
        otpCancel: infoFor('.xyz-otp-cancel'),
      },
      hasAuthFailed: /authentication failed/i.test(text),
      hasLoginSucceeded: /client login succeeds/i.test(text),
    };
  });

  console.log(JSON.stringify(state, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
