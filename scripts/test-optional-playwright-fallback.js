const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function missingPlaywrightError() {
  const err = new Error("Cannot find module 'playwright'");
  err.code = 'MODULE_NOT_FOUND';
  return err;
}

function loadFresh(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function expectThrows(fn, pattern, label) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, `Expected ${label} to throw`);
  assert(pattern.test(thrown.message), `Expected ${label} error to match ${pattern}, got: ${thrown.message}`);
}

function main() {
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === './browserSessionClient') {
      throw missingPlaywrightError();
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    const pricing = loadFresh('../src/brokers/interactive-brokers/pricing');
    const instruments = loadFresh('../src/brokers/interactive-brokers/instruments');

    assert(typeof pricing.fetchLatestPrice === 'function', 'Expected pricing module to load without optional playwright');
    assert(typeof instruments.searchEtfInstruments === 'function', 'Expected instruments module to load without optional playwright');

    expectThrows(() => pricing.loadBrowserSessionClient(), /optional playwright dependency/i, 'pricing lazy browser-session loader');
    expectThrows(() => instruments.loadBrowserSessionClient(), /optional playwright dependency/i, 'instrument lazy browser-session loader');

    console.log(JSON.stringify({ ok: true }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main();
