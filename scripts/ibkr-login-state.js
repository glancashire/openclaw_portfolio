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
  await page.waitForTimeout(2500);

  const state = await page.evaluate(() => {
    const visible = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const enabled = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      return !('disabled' in el) || !el.disabled;
    };
    const body = document.body.innerText || '';

    let mode = 'unknown';
    if (/authentication failed/i.test(body)) mode = 'auth_failed';
    else if (/client login succeeds/i.test(body)) mode = 'login_succeeded';
    else if (visible('#xyz-field-silver-response') && enabled('#xyz-field-silver-response')) mode = 'app_code';
    else if (visible('.xyz-otp-select-text') || visible('.xyz-otp-select-voice') || visible('.xyz-otp-select-email')) mode = 'otp_choice';
    else if (visible('#xyz-field-bronze-response')) mode = 'security_card';
    else if (visible('form.xyzform-fido button[type="submit"]')) mode = 'fido';
    else if (visible('#xyz-field-temp-response')) mode = 'temporary_code';
    else if (visible('#xyz-field-username')) mode = 'credentials';

    return {
      mode,
      url: location.href,
      title: document.title,
      body: body.slice(0, 2000),
      flags: {
        silverVisible: visible('#xyz-field-silver-response'),
        silverEnabled: enabled('#xyz-field-silver-response'),
        otpTextVisible: visible('.xyz-otp-select-text'),
        otpVoiceVisible: visible('.xyz-otp-select-voice'),
        otpEmailVisible: visible('.xyz-otp-select-email'),
        bronzeVisible: visible('#xyz-field-bronze-response'),
        fidoVisible: visible('form.xyzform-fido button[type="submit"]'),
        tempVisible: visible('#xyz-field-temp-response'),
      }
    };
  });

  console.log(JSON.stringify(state, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
