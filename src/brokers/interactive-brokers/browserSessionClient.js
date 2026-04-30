const { chromium } = require('playwright');
const { loadInteractiveBrokersConfig, validateInteractiveBrokersConfig } = require('./config');

class InteractiveBrokersBrowserSessionClient {
  constructor(options = {}) {
    this.options = options;
    this.config = loadInteractiveBrokersConfig();
    this.baseUrl = this.config.baseUrl;
    this.portalBaseUrl = derivePortalBaseUrl(this.baseUrl);
  }

  configurationStatus() {
    return validateInteractiveBrokersConfig(this.config);
  }

  async withAuthenticatedPage(fn) {
    const status = this.configurationStatus();
    if (!status.ok) throw new Error(`Missing config: ${status.missing.join(', ')}`);
    const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    try {
      await login(page, this.config);
      return await fn(page, context, this.portalBaseUrl);
    } finally {
      await browser.close();
    }
  }

  async authenticateWithCode(appCode) {
    return this.withAuthenticatedPage(async (page) => {
      if (appCode) {
        await submitAuthenticatorCode(page, appCode);
      }
      return capturePageState(page);
    });
  }

  async fetchAuthStatus(appCode) {
    return this.withAuthenticatedPage(async (page) => {
      if (appCode) await submitAuthenticatorCode(page, appCode);
      return browserFetch(page, `${this.portalBaseUrl}/iserver/auth/status`);
    });
  }

  async fetchTickle(appCode) {
    return this.withAuthenticatedPage(async (page) => {
      if (appCode) await submitAuthenticatorCode(page, appCode);
      return browserFetch(page, `${this.portalBaseUrl}/tickle`);
    });
  }

  async searchContracts(query, appCode) {
    return this.withAuthenticatedPage(async (page) => {
      if (appCode) await submitAuthenticatorCode(page, appCode);
      return browserFetch(page, `${this.portalBaseUrl}/iserver/secdef/search?symbol=${encodeURIComponent(query)}`);
    });
  }

  async fetchMarketSnapshot(conids, fields = ['31', '84', '85', '86'], appCode) {
    const list = Array.isArray(conids) ? conids.filter(Boolean).join(',') : String(conids || '');
    const fieldList = Array.isArray(fields) ? fields.join(',') : String(fields || '31,84,85,86');
    return this.withAuthenticatedPage(async (page) => {
      if (appCode) await submitAuthenticatorCode(page, appCode);
      return browserFetch(page, `${this.portalBaseUrl}/iserver/marketdata/snapshot?conids=${encodeURIComponent(list)}&fields=${encodeURIComponent(fieldList)}`);
    });
  }
}

function derivePortalBaseUrl(baseUrl) {
  const origin = new URL(baseUrl).origin;
  return `${origin}/portal.proxy/v1/portal`;
}

async function login(page, config) {
  await page.goto('https://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.fill('#xyz-field-username', config.username);
  await page.fill('#xyz-field-password', config.password);
  await page.locator('form.xyzform-username button[type="submit"]').click();
  await waitForSecondFactor(page);
}

async function waitForSecondFactor(page) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const state = await detectAuthStage(page);
    if (state.stage === 'app-code' || state.stage === 'temp-code' || state.stage === 'success') {
      return state;
    }
    if (state.stage === 'failed') {
      throw new Error(`IBKR login failed before second factor: ${state.body}`);
    }
    await page.waitForTimeout(500);
  }
  throw new Error('Timed out waiting for IBKR second-factor stage');
}

async function submitAuthenticatorCode(page, appCode) {
  const state = await waitForSecondFactor(page);
  if (state.stage === 'success') return;
  if (state.stage === 'app-code') {
    const silver = page.locator('#xyz-field-silver-response');
    await silver.fill(String(appCode));
    await page.locator('form.xyzform-silver button[type="submit"]').last().click();
  } else if (state.stage === 'temp-code') {
    const temp = page.locator('#xyz-field-temp-response');
    await temp.fill(String(appCode));
    await page.locator('form.xyzform-temp button[type="submit"]').click();
  } else {
    throw new Error(`Unsupported IBKR second-factor stage: ${state.stage}`);
  }
  await waitForPostSubmit(page);
}

async function waitForPostSubmit(page) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const state = await detectAuthStage(page);
    if (state.stage === 'success') return state;
    if (state.stage === 'failed') {
      throw new Error(`IBKR second-factor failed: ${state.body}`);
    }
    if (state.stage === 'app-code' || state.stage === 'temp-code') {
      await page.waitForTimeout(500);
      continue;
    }
    await page.waitForTimeout(500);
  }
  throw new Error('Timed out waiting for IBKR post-login success state');
}

async function browserFetch(page, url) {
  return page.evaluate(async (u) => {
    const res = await fetch(u, { credentials: 'include' });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { ok: res.ok, status: res.status, text, json };
  }, url);
}

async function detectAuthStage(page) {
  const body = (await page.locator('body').innerText()).slice(0, 4000);
  const url = page.url();
  const silverVisible = await page.locator('#xyz-field-silver-response').isVisible().catch(() => false);
  const tempVisible = await page.locator('#xyz-field-temp-response').isVisible().catch(() => false);
  if (/Client login succeeds/i.test(body) || /\/sso\/Dispatcher/.test(url)) {
    return { stage: 'success', body, url };
  }
  if (/Authentication failed/i.test(body) || /Incorrect security code/i.test(body)) {
    return { stage: 'failed', body, url };
  }
  if (silverVisible) {
    return { stage: 'app-code', body, url };
  }
  if (tempVisible) {
    return { stage: 'temp-code', body, url };
  }
  return { stage: 'unknown', body, url };
}

async function capturePageState(page) {
  return {
    url: page.url(),
    title: await page.title(),
    body: (await page.locator('body').innerText()).slice(0, 4000),
  };
}

module.exports = { InteractiveBrokersBrowserSessionClient, derivePortalBaseUrl };
