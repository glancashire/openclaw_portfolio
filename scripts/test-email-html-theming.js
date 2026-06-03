/**
 * Tests for src/reporting/emailHtml.js light/dark theming.
 *
 * Confirms:
 * - all exports are still present and callable
 * - page() head includes color-scheme meta tags
 * - page() includes a <style> block with @media (prefers-color-scheme: dark)
 * - page() includes [data-ogsc] / [data-ogsb] Outlook dark hooks
 * - PnL helpers expose positive/negative tokens that match the spec
 * - the gradient hero is no longer emitted (lighter design)
 * - light fallback colors are inlined on key elements
 * - card / badge / dataTable / metricGrid / kvTable / bulletList still render
 *
 * Spec: docs/email-dashboard-light-dark-spec.md
 */

const assert = require('assert');
const html = require('../src/reporting/emailHtml');

(function exportsPresent() {
  for (const key of [
    'BRAND', 'TOKENS', 'buildThemeStyleBlock',
    'escapeHtml', 'formatCurrency', 'formatPercent',
    'page', 'card', 'badge', 'metricGrid', 'kvTable', 'dataTable', 'bulletList',
  ]) {
    assert(html[key] !== undefined, `expected export "${key}"`);
  }
  // BRAND back-compat shape
  for (const key of ['bg', 'surface', 'text', 'success', 'danger', 'warn', 'info', 'line']) {
    assert(typeof html.BRAND[key] === 'string' && html.BRAND[key].length, `BRAND.${key} is non-empty string`);
  }
  // TOKENS shape
  assert(html.TOKENS.light && html.TOKENS.dark, 'TOKENS has light + dark');
  assert.strictEqual(html.TOKENS.light.bg, '#ffffff');
  assert.strictEqual(html.TOKENS.dark.bg, '#0b1220');
  assert.strictEqual(html.TOKENS.light.positive, '#166534');
  assert.strictEqual(html.TOKENS.light.negative, '#991b1b');
  assert.strictEqual(html.TOKENS.dark.positive, '#34d399');
  assert.strictEqual(html.TOKENS.dark.negative, '#f87171');
})();

(function pageStructure() {
  const out = html.page({
    eyebrow: 'OPENCLAW',
    title: 'Daily snapshot',
    subtitle: 'CHF 121\u2019730.94 \u00b7 2026-06-03',
    bodyHtml: '<p>body</p>',
    footer: 'Footer line',
  });

  // basic shell
  assert(out.startsWith('<!DOCTYPE html>'));
  assert(out.includes('<html>'));
  assert(out.includes('</html>'));

  // dark-mode awareness signals
  assert(out.includes('<meta name="color-scheme" content="light dark">'), 'color-scheme meta');
  assert(out.includes('<meta name="supported-color-schemes" content="light dark">'), 'supported-color-schemes meta');
  assert(out.includes('@media (prefers-color-scheme: dark)'), 'dark media query');
  assert(out.includes('[data-ogsc]'), 'Outlook ogsc hook');
  assert(out.includes('[data-ogsb]'), 'Outlook ogsb hook');

  // class hook scaffolding present on key wrappers
  assert(out.includes('class="t-page'), 't-page hook on body');
  assert(out.includes('class="t-shell'), 't-shell hook on outer card');

  // gradient hero is gone
  assert(!out.includes('linear-gradient'), 'no gradient hero');

  // light fallbacks inlined (key colors)
  assert(out.includes('#ffffff'), 'white surface inline fallback');
  assert(out.includes('#0f172a'), 'text inline fallback');

  // contains dark token in the <style> block (so the block is real, not stub)
  assert(out.includes('#0b1220'), 'dark bg defined in <style> block');
  assert(out.includes('#0f1623'), 'dark surface defined in <style> block');
  assert(out.includes('#34d399'), 'dark positive defined in <style> block');
  assert(out.includes('#f87171'), 'dark negative defined in <style> block');

  // body content survives
  assert(out.includes('<p>body</p>'));
  assert(out.includes('Daily snapshot'));
  assert(out.includes('OPENCLAW'));
  assert(out.includes('Footer line'));
})();

(function cardAndBadge() {
  const c = html.card({ title: 'Section', contentHtml: '<p>x</p>' });
  assert(c.includes('Section'));
  assert(c.includes('<p>x</p>'));
  assert(c.includes('class="t-card'), 'card has t-card hook');
  assert(c.includes('#ffffff'), 'card light fallback');

  const cWarn = html.card({ title: 'W', contentHtml: '<p>x</p>', tone: 'warn' });
  assert(cWarn.includes('#ffedd5'), 'warn tone uses subtle warn surface');

  const b = html.badge({ label: 'OK', tone: 'success' });
  assert(b.includes('OK'));
  assert(b.includes('class="t-badge-success'), 'success badge class');

  const bDanger = html.badge({ label: 'BAD', tone: 'danger' });
  assert(bDanger.includes('class="t-badge-danger'), 'danger badge class');
})();

(function tablesAndLists() {
  const grid = html.metricGrid([
    { label: 'A', value: '1' },
    { label: 'B', value: '2', detail: 'extra' },
  ]);
  assert(grid.includes('A') && grid.includes('1'));
  assert(grid.includes('B') && grid.includes('2') && grid.includes('extra'));

  const kv = html.kvTable([{ label: 'k', value: 'v' }]);
  assert(kv.includes('k') && kv.includes('v'));

  const dt = html.dataTable({
    columns: [{ label: 'C1' }, { label: 'C2', align: 'right' }],
    rows: [['r1c1', 'r1c2']],
  });
  assert(dt.includes('C1') && dt.includes('C2'));
  assert(dt.includes('r1c1') && dt.includes('r1c2'));

  const dtEmpty = html.dataTable({
    columns: [{ label: 'C1' }],
    rows: [],
  });
  assert(dtEmpty.includes('No items.'));

  const list = html.bulletList(['x', 'y']);
  assert(list.includes('<li') && list.includes('x') && list.includes('y'));

  const empty = html.bulletList([]);
  assert(empty.includes('No items.'));
})();

(function escapingAndFormatting() {
  assert.strictEqual(html.escapeHtml('<a>"\'&'), '&lt;a&gt;&quot;&#39;&amp;');
  assert.strictEqual(html.formatPercent(1.234), '+1.2%');
  assert.strictEqual(html.formatPercent(-0.5), '-0.5%');
  assert.strictEqual(html.formatPercent('not a number'), '\u2014');
  // formatCurrency uses Swiss-locale grouping ('); just check shape
  const ccy = html.formatCurrency(1234.5, 'CHF');
  assert(ccy.startsWith('CHF '));
  assert(ccy.includes('1') && ccy.includes('234'));
})();

(function noUndefinedInterpolation() {
  // Smoke: page with no subtitle should not include "undefined"
  const out = html.page({ title: 'T', bodyHtml: '<p>x</p>' });
  assert(!out.includes('undefined'), 'no undefined in HTML output');
})();

console.log(JSON.stringify({ ok: true }, null, 2));
