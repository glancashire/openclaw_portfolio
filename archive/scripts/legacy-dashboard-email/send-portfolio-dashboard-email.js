'use strict';
/**
 * send-portfolio-dashboard-email.js
 *
 * Generates and sends a clean HTML portfolio dashboard email.
 * Reads live holdings/dashboard state, builds grouped table with commentary,
 * and delivers via Mailgun to the configured recipient.
 *
 * Usage:
 *   node scripts/send-portfolio-dashboard-email.js [portfolio]
 *
 * Options:
 *   --dry-run   Print subject + text, skip send
 *   --reason=<text>   Override the trigger reason shown in the email footer
 */

const fs = require('fs');
const path = require('path');
const { sendEmailMessage } = require('../src/reporting/emailDelivery');

const ROOT = path.resolve(__dirname, '..');

function extractNumber(label, text) {
  const re = new RegExp(`- ${label}: ([^\n]+)`);
  const m = text.match(re);
  if (!m) return null;
  return Number(String(m[1]).replace(/ \(avg cost\)/g, '').replace(/'/g, '').trim());
}

const fmt0 = (n) => n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmt2 = (n) => n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt3 = (n) => n.toLocaleString('de-CH', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const GROUPS = [
  { id: 'us', label: '🇺🇸 United States', symbols: ['SXR8'] },
  { id: 'eu', label: '🇪🇺 Europe', symbols: ['EMUAA', 'UKGBPB'] },
  { id: 'ch', label: '🇨🇭 Switzerland', symbols: ['SPMCHA', 'CHSPI'] },
  { id: 'asia', label: '🌏 Asia', symbols: ['CEBL', 'LCUJ', 'HMCD'] },
  { id: 'topic', label: '🔬 Thematic', symbols: ['SEC0', 'AIFS', 'XAIX'] },
];

const FRIENDLY = {
  SXR8: 'iShares Core S&P 500',
  EMUAA: 'UBS MSCI EMU',
  SPMCHA: 'UBS SPI Mid',
  CEBL: 'iShares MSCI EM Asia',
  CHSPI: 'iShares Core SPI',
  SEC0: 'iShares Semiconductors',
  LCUJ: 'Amundi MSCI Japan',
  UKGBPB: 'UBS MSCI UK',
  HMCD: 'HSBC MSCI China',
  AIFS: 'iShares AI Infrastructure',
  XAIX: 'Xtrackers AI & Big Data',
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const reasonArg = args.find(a => a.startsWith('--reason='));
  const reason = reasonArg ? reasonArg.split('=').slice(1).join('=') : null;
  const portfolio = args.find(a => !a.startsWith('--')) || 'etf';
  const portfolioDir = path.join(ROOT, 'portfolio', portfolio);

  const holdingsMd = fs.readFileSync(path.join(portfolioDir, 'holdings.md'), 'utf8');
  const dashboardMd = fs.readFileSync(path.join(portfolioDir, 'dashboard.md'), 'utf8');

  const totalValue = extractNumber('Total value CHF', holdingsMd);
  const cashChf = extractNumber('Broker account cash CHF', holdingsMd);
  const investedChf = extractNumber('Invested value CHF', holdingsMd);
  const unrealizedChf = extractNumber('Total unrealized profit CHF', dashboardMd);
  const unrealizedPct = extractNumber('Total unrealized profit %', dashboardMd);
  const contributedChf = 120000;
  const netGainChf = totalValue - contributedChf;
  const netGainPct = (netGainChf / contributedChf) * 100;

  // Parse holdings
  const holdings = [];
  let inTable = false;
  for (const line of holdingsMd.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '## Current Holdings') { inTable = true; continue; }
    if (inTable && trimmed.startsWith('## ')) break;
    if (!inTable) continue;
    if (!trimmed.startsWith('|') || trimmed.startsWith('|---') || /Ticker \/ ISIN/.test(trimmed)) continue;
    const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 8) continue;
    holdings.push({
      name: cells[1],
      quantity: Number(cells[3]),
      priceNative: Number(String(cells[4]).replace(/ \(avg cost\)/g, '')),
      currency: cells[5],
      valueChf: Number(cells[7]),
    });
  }

  // Parse P/L
  const plMap = new Map();
  let inPl = false;
  for (const line of dashboardMd.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '## Profit / Loss') { inPl = true; continue; }
    if (inPl && trimmed.startsWith('## ')) break;
    if (!inPl) continue;
    if (!trimmed.startsWith('|') || trimmed.startsWith('|---') || /Instrument \| Value CHF/.test(trimmed)) continue;
    const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length < 6) continue;
    plMap.set(cells[0], {
      profitChf: Number(String(cells[3]).replace(/['+]/g, '').trim()),
      profitPct: String(cells[4]).trim(),
    });
  }

  // Build grouped holdings HTML
  let holdingsTableHtml = '';
  let totalInvestedSum = 0;
  let isFirstGroup = true;

  for (const group of GROUPS) {
    const groupHoldings = group.symbols.map(s => holdings.find(h => h.name === s)).filter(Boolean);
    groupHoldings.sort((a, b) => b.valueChf - a.valueChf);
    const groupValue = groupHoldings.reduce((s, h) => s + h.valueChf, 0);
    const groupWeight = (groupValue / totalValue * 100).toFixed(1);
    totalInvestedSum += groupValue;

    holdingsTableHtml += `
      <tr style="background:#f2f4f7;">
        <td colspan="6" style="padding:${isFirstGroup ? '10' : '18'}px 10px 10px 10px; font-weight:600; font-size:13px; border-bottom:1px solid #e4e7ec;">
          ${esc(group.label)} <span style="float:right; color:#475467; font-weight:400;">CHF ${fmt0(groupValue)} · ${groupWeight}%</span>
        </td>
      </tr>`;
    isFirstGroup = false;

    for (const h of groupHoldings) {
      const pl = plMap.get(h.name) || null;
      const weight = (h.valueChf / totalValue * 100).toFixed(1);
      const plColor = pl && pl.profitChf < 0 ? '#b42318' : '#067647';
      const plSign = pl && pl.profitChf >= 0 ? '+' : '';
      holdingsTableHtml += `
      <tr>
        <td style="padding:7px 10px; border-bottom:1px solid #f2f4f7;"><strong>${esc(h.name)}</strong><br/><span style="color:#667085; font-size:11px;">${esc(FRIENDLY[h.name] || '')}</span></td>
        <td style="padding:7px 10px; border-bottom:1px solid #f2f4f7; text-align:right;">${fmt0(h.quantity)}</td>
        <td style="padding:7px 10px; border-bottom:1px solid #f2f4f7; text-align:right;">${fmt3(h.priceNative)} ${esc(h.currency)}</td>
        <td style="padding:7px 10px; border-bottom:1px solid #f2f4f7; text-align:right;">CHF ${fmt0(h.valueChf)}</td>
        <td style="padding:7px 10px; border-bottom:1px solid #f2f4f7; text-align:right;">${weight}%</td>
        <td style="padding:7px 10px; border-bottom:1px solid #f2f4f7; text-align:right; color:${plColor};">${pl ? `${plSign}${fmt0(pl.profitChf)} (${esc(pl.profitPct)})` : '—'}</td>
      </tr>`;
    }
  }

  holdingsTableHtml += `
    <tr style="font-weight:700; background:#f9fafb;">
      <td style="padding:10px; border-top:2px solid #d0d5dd;">Total Invested</td>
      <td style="padding:10px; border-top:2px solid #d0d5dd;"></td>
      <td style="padding:10px; border-top:2px solid #d0d5dd;"></td>
      <td style="padding:10px; border-top:2px solid #d0d5dd; text-align:right;">CHF ${fmt0(totalInvestedSum)}</td>
      <td style="padding:10px; border-top:2px solid #d0d5dd; text-align:right;">${(totalInvestedSum / totalValue * 100).toFixed(1)}%</td>
      <td style="padding:10px; border-top:2px solid #d0d5dd;"></td>
    </tr>
    <tr style="color:#475467;">
      <td style="padding:6px 10px;">Cash</td>
      <td style="padding:6px 10px;"></td>
      <td style="padding:6px 10px;"></td>
      <td style="padding:6px 10px; text-align:right;">CHF ${fmt0(cashChf)}</td>
      <td style="padding:6px 10px; text-align:right;">${(cashChf / totalValue * 100).toFixed(1)}%</td>
      <td style="padding:6px 10px;"></td>
    </tr>
    <tr style="font-weight:700;">
      <td style="padding:10px; border-top:1px solid #d0d5dd;">Portfolio Total</td>
      <td style="padding:10px; border-top:1px solid #d0d5dd;"></td>
      <td style="padding:10px; border-top:1px solid #d0d5dd;"></td>
      <td style="padding:10px; border-top:1px solid #d0d5dd; text-align:right;">CHF ${fmt0(totalValue)}</td>
      <td style="padding:10px; border-top:1px solid #d0d5dd; text-align:right;">100.0%</td>
      <td style="padding:10px; border-top:1px solid #d0d5dd;"></td>
    </tr>`;

  // Commentary
  const usW = ((holdings.find(h => h.name === 'SXR8')?.valueChf || 0) / totalValue * 100).toFixed(1);
  const euW = (((holdings.find(h => h.name === 'EMUAA')?.valueChf || 0) + (holdings.find(h => h.name === 'UKGBPB')?.valueChf || 0)) / totalValue * 100).toFixed(1);
  const chW = (((holdings.find(h => h.name === 'SPMCHA')?.valueChf || 0) + (holdings.find(h => h.name === 'CHSPI')?.valueChf || 0)) / totalValue * 100).toFixed(1);
  const asiaW = (((holdings.find(h => h.name === 'CEBL')?.valueChf || 0) + (holdings.find(h => h.name === 'LCUJ')?.valueChf || 0) + (holdings.find(h => h.name === 'HMCD')?.valueChf || 0)) / totalValue * 100).toFixed(1);
  const topicW = (((holdings.find(h => h.name === 'SEC0')?.valueChf || 0) + (holdings.find(h => h.name === 'AIFS')?.valueChf || 0) + (holdings.find(h => h.name === 'XAIX')?.valueChf || 0)) / totalValue * 100).toFixed(1);

  // Best/worst performers
  const sorted = [...plMap.entries()].sort((a, b) => b[1].profitChf - a[1].profitChf);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const commentary = `
    <h2 style="font-size:16px; margin:32px 0 12px; border-bottom:2px solid #e4e7ec; padding-bottom:6px;">📝 Portfolio Commentary</h2>
    <div style="font-size:13px; color:#344054; line-height:1.7;">
      <p style="margin:0 0 12px;">
        <strong>Overview:</strong> The portfolio stands at CHF ${fmt0(totalValue)}, with CHF ${fmt0(cashChf)} in cash (${(cashChf / totalValue * 100).toFixed(1)}%).
        Unrealized P/L across all positions is CHF ${fmt0(unrealizedChf)} (${unrealizedPct >= 0 ? '+' : ''}${fmt2(unrealizedPct)}%).
      </p>
      <p style="margin:0 0 12px;">
        <strong>Regional balance:</strong> US ${usW}% · Europe ${euW}% · Switzerland ${chW}% · Asia ${asiaW}% · Thematic ${topicW}%.
      </p>
      <p style="margin:0 0 12px;">
        <strong>Best performer:</strong> ${best ? `${best[0]} (${best[1].profitPct})` : '—'}.
        <strong>Worst:</strong> ${worst ? `${worst[0]} (${worst[1].profitPct})` : '—'}.
      </p>
    </div>

    <h2 style="font-size:16px; margin:28px 0 12px; border-bottom:2px solid #e4e7ec; padding-bottom:6px;">💡 Recommendations</h2>
    <div style="font-size:13px; color:#344054; line-height:1.7;">
      <table style="width:100%; border-collapse:collapse;">
        <tr>
          <td style="padding:10px 12px; vertical-align:top; border-bottom:1px solid #f2f4f7; width:24px;">1.</td>
          <td style="padding:10px 0; border-bottom:1px solid #f2f4f7;">
            <strong>Next cash → S&P 500 (SXR8).</strong> The US sleeve at ${usW}% is the largest single underweight. Priority add on next deposit.
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px; vertical-align:top; border-bottom:1px solid #f2f4f7;">2.</td>
          <td style="padding:10px 0; border-bottom:1px solid #f2f4f7;">
            <strong>Consider a bond/defensive sleeve.</strong> Portfolio is ${((investedChf / totalValue) * 100).toFixed(0)}% equities. A short-duration CHF bond ETF would reduce volatility.
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px; vertical-align:top; border-bottom:1px solid #f2f4f7;">3.</td>
          <td style="padding:10px 0; border-bottom:1px solid #f2f4f7;">
            <strong>Monitor FX.</strong> ~60% of holdings are EUR/USD/GBP-denominated. Watch for CHF strength headwinds.
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px; vertical-align:top;">4.</td>
          <td style="padding:10px 0;">
            <strong>Hold current positions.</strong> Let new entries season before rebalancing. Review in 4–8 weeks.
          </td>
        </tr>
      </table>
    </div>`;

  const now = new Date();
  const triggerNote = reason ? `<br/>Trigger: ${esc(reason)}` : '';
  const subject = `📊 ETF Portfolio Dashboard — ${now.toISOString().slice(0, 10)}`;

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:760px; margin:0 auto; padding:24px; color:#101828; background:#ffffff;">
  <h1 style="margin:0 0 4px; font-size:24px;">ETF Portfolio</h1>
  <p style="margin:0 0 24px; color:#667085; font-size:13px;">${now.toISOString().slice(0, 10)} · Account U25624150</p>

  <table style="width:100%; border-collapse:separate; border-spacing:16px 0;">
    <tr>
      <td style="background:#dbeafe; border:1px solid #93c5fd; border-radius:12px; padding:16px; width:33%;">
        <div style="font-size:12px; color:#1e40af; text-transform:uppercase; letter-spacing:.04em; font-weight:500;">Total Value</div>
        <div style="font-size:28px; font-weight:700; margin-top:6px; color:#1e3a5f;">CHF ${fmt0(totalValue)}</div>
      </td>
      <td style="background:#ecfdf3; border:1px solid #d1fadf; border-radius:12px; padding:16px; width:33%;">
        <div style="font-size:12px; color:#067647; text-transform:uppercase; letter-spacing:.04em; font-weight:500;">Net Gain vs 120k</div>
        <div style="font-size:28px; font-weight:700; margin-top:6px; color:#067647;">+CHF ${fmt0(netGainChf)}</div>
        <div style="font-size:14px; color:#067647; margin-top:4px;">+${fmt2(netGainPct)}%</div>
      </td>
      <td style="background:#fff8eb; border:1px solid #f7d9a7; border-radius:12px; padding:16px; width:33%;">
        <div style="font-size:12px; color:#93370d; text-transform:uppercase; letter-spacing:.04em; font-weight:500;">Cash</div>
        <div style="font-size:28px; font-weight:700; margin-top:6px; color:#93370d;">CHF ${fmt0(cashChf)}</div>
      </td>
    </tr>
  </table>

  <h2 style="font-size:16px; margin:32px 0 10px;">Holdings by Region / Theme</h2>
  <table style="width:100%; border-collapse:collapse; font-size:13px;">
    <tr style="color:#475467; font-size:11px; text-transform:uppercase; letter-spacing:.04em;">
      <th style="text-align:left; padding:8px 10px; border-bottom:2px solid #e4e7ec;">Instrument</th>
      <th style="text-align:right; padding:8px 10px; border-bottom:2px solid #e4e7ec;">Units</th>
      <th style="text-align:right; padding:8px 10px; border-bottom:2px solid #e4e7ec;">Price</th>
      <th style="text-align:right; padding:8px 10px; border-bottom:2px solid #e4e7ec;">Value</th>
      <th style="text-align:right; padding:8px 10px; border-bottom:2px solid #e4e7ec;">Weight</th>
      <th style="text-align:right; padding:8px 10px; border-bottom:2px solid #e4e7ec;">P/L</th>
    </tr>
    ${holdingsTableHtml}
  </table>

  ${commentary}

  <p style="margin-top:24px; font-size:11px; color:#98a2b3; border-top:1px solid #eaecf0; padding-top:12px;">
    Net gain = portfolio value minus CHF 120,000 contributed capital. Unrealized P/L: CHF ${fmt0(unrealizedChf)} (${unrealizedPct >= 0 ? '+' : ''}${fmt2(unrealizedPct)}%).
    ${triggerNote}
    <br/>Generated ${now.toISOString().slice(0, 16)} UTC · OpenClaw Portfolio Manager
  </p>
</body>
</html>`;

  const text = `ETF Portfolio — CHF ${fmt0(totalValue)} | Net +CHF ${fmt0(netGainChf)} (+${fmt2(netGainPct)}%)\nSee HTML version for full dashboard.`;

  if (dryRun) {
    console.log('DRY RUN — would send:');
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('HTML length:', html.length);
    return;
  }

  const policy = { emailRecipients: ['lancashire@swift.ch'] };
  const result = await sendEmailMessage({ policy, subject, text, html });
  console.log(JSON.stringify({ ok: true, subject, ...result }));
}

main().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
