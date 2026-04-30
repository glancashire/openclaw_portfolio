const { chromium } = require('playwright');

async function getText(page, sel) {
  try {
    const loc = page.locator(sel);
    if (await loc.count()) return (await loc.first().innerText()).trim();
  } catch {}
  return null;
}

async function tryMode(page, mode, password, twofa) {
  await page.goto('https://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (mode === 'paper') {
    const toggle = page.locator('#toggle1');
    if (await toggle.count()) {
      const checked = await toggle.isChecked().catch(() => false);
      if (!checked) await toggle.check().catch(async () => { await toggle.click(); });
      await page.waitForTimeout(500);
    }
  }

  await page.fill('#xyz-field-username', process.env.IBKR_USERNAME);
  await page.fill('#xyz-field-password', password);
  await page.locator('form.xyzform-username button[type="submit"]').click();
  await page.waitForTimeout(2500);

  const silver = page.locator('#xyz-field-silver-response');
  const temp = page.locator('#xyz-field-temp-response');
  const textBtn = page.locator('button.xyz-otp-select-text');
  const resendBtn = page.locator('button.xyz-resend-sms-button');

  const state = {
    mode,
    url: page.url(),
    title: await page.title(),
    body: (await page.locator('body').innerText()).slice(0, 5000),
    silverVisible: await silver.isVisible().catch(() => false),
    tempVisible: await temp.isVisible().catch(() => false),
    textBtnVisible: await textBtn.isVisible().catch(() => false),
    resendVisible: await resendBtn.isVisible().catch(() => false),
    errorText: await getText(page, 'text=/incorrect|invalid|failed|required|security code/i'),
  };

  if (!state.tempVisible && state.textBtnVisible) {
    await textBtn.click();
    await page.waitForTimeout(2000);
    state.tempVisibleAfterText = await temp.isVisible().catch(() => false);
  }

  if (!state.silverVisible && state.resendVisible) {
    state.silverVisibleAfterWait = await silver.isVisible().catch(() => false);
  }

  if (twofa) {
    if (await silver.isVisible().catch(() => false)) {
      await silver.fill(twofa);
      await page.locator('form.xyzform-silver button[type="submit"]').last().click();
      await page.waitForTimeout(5000);
      state.after2fa = {
        url: page.url(),
        title: await page.title(),
        body: (await page.locator('body').innerText()).slice(0, 5000),
      };
      return state;
    }
    if (await temp.isVisible().catch(() => false)) {
      await temp.fill(twofa);
      await page.locator('form.xyzform-temp button[type="submit"]').click();
      await page.waitForTimeout(5000);
      state.after2fa = {
        url: page.url(),
        title: await page.title(),
        body: (await page.locator('body').innerText()).slice(0, 5000),
      };
      return state;
    }
  }

  return state;
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });

  const password = process.env.IBKR_PASSWORD;
  const twofa = process.env.IBKR_2FA || '';
  if (!process.env.IBKR_USERNAME || !password) throw new Error('Missing creds');

  const live = await tryMode(page, 'live', password, twofa);
  console.log('LIVE_RESULT:', JSON.stringify(live, null, 2));

  const paper = await tryMode(page, 'paper', password, twofa);
  console.log('PAPER_RESULT:', JSON.stringify(paper, null, 2));

  await page.screenshot({ path: 'tmp/ibkr-final-state.png', fullPage: true });
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
