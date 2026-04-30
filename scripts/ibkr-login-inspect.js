const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors'] });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  await page.goto('https://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  const data = await page.evaluate(() => {
    const forms = [...document.forms].map((form, i) => ({
      index: i,
      action: form.action,
      method: form.method,
      id: form.id || null,
      className: form.className || null,
      inputs: [...form.querySelectorAll('input,button,select,textarea')].map((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.id || null,
        value: el.getAttribute('value'),
        text: (el.innerText || '').trim().slice(0, 200),
        placeholder: el.getAttribute('placeholder'),
        autocomplete: el.getAttribute('autocomplete'),
      })),
    }));
    const radios = [...document.querySelectorAll('input[type="radio"], button, [role="button"], label')].map((el) => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.id || null,
      for: el.getAttribute('for'),
      text: (el.innerText || el.textContent || '').trim().slice(0, 200),
      value: el.getAttribute('value'),
      classes: el.className || null,
    }));
    return { title: document.title, url: location.href, forms, radios, body: document.body.innerText.slice(0, 5000) };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
