const fs = require('fs');

function parseHoldingSummary(text) {
  const get = (label) => {
    const m = text.match(new RegExp(`- ${label}:\\s*(.+)`));
    return m ? m[1].trim() : '0';
  };
  return {
    total: get('Total value CHF'),
    invested: get('Invested value CHF'),
    cash: get('Cash CHF'),
  };
}

function appendHistorySnapshot(historyPath, holdingsPath, snapshot = 'end_of_day', notes = '') {
  const holdingsText = fs.readFileSync(holdingsPath, 'utf8');
  const summary = parseHoldingSummary(holdingsText);
  const date = new Date().toISOString().slice(0, 10);
  const row = `| ${date} | ${snapshot} | ${summary.total} | ${summary.invested} | ${summary.cash} | 0 | 0 | ${notes} |`;

  let text = fs.readFileSync(historyPath, 'utf8').trimEnd();
  text += `\n${row}\n`;
  fs.writeFileSync(historyPath, text);
  return { appended: true, row };
}

module.exports = { appendHistorySnapshot };
