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
  await page.waitForTimeout(2500);

  const state = await detectState(page);
  if (state.mode !== 'app_code') {
    console.log(JSON.stringify({ ok: false, stage: 'pre_code', state }, null, 2));
    await browser.close();
    process.exit(1);
  }

  await page.fill('#xyz-field-silver-response', code);
  await page.locator('form.xyzform-silver button[type="submit"]').click();
  await page.waitForTimeout(3000);

  const after = await detectState(page);
  const auth = await context.request.get('https://localhost:5000/portal.proxy/v1/portal/iserver/auth/status', { failOnStatusCode: false });
  const tickle = await context.request.get('https://localhost:5000/portal.proxy/v1/portal/tickle', { failOnStatusCode: false });

  console.log(JSON.stringify({
    ok: !after.hasAuthFailed,
    stage: 'post_code',
    stateBefore: state,
    stateAfter: after,
    auth: { status: auth.status(), text: await auth.text() },
    tickle: { status: tickle.status(), text: await tickle.text() },
  }, null, 2));

  await browser.close();
}

async function detectState(page) {
  return page.evaluate(() => {
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
      hasAuthFailed: /authentication failed/i.test(body),
      hasLoginSucceeded: /client login succeeds/i.test(body),
    };
  });
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
