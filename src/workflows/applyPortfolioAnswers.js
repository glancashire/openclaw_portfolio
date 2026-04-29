const fs = require('fs');

function replaceLine(text, label, value) {
  const re = new RegExp(`(- ${label}:\\s*)(.*)`);
  return text.replace(re, `$1${value}`);
}

function removeOpenQuestion(text, needle) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== `- ${needle}`)
    .join('\n');
}

function replaceExcludedInstrumentsTable(text, rows) {
  const table = rows && rows.length
    ? rows.map((row) => `| ${row.instrument} | ${row.reason} |`).join('\n')
    : '| none | none |';
  return text.replace(
    /## Excluded Instruments\n[\s\S]*?(?=\n## Rebalancing Policy)/,
    `## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n${table}\n`
  );
}

function normalizeExcludedInstruments(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const trimmed = String(value).trim();
  if (!trimmed || /^none$/i.test(trimmed)) return [];
  return trimmed.split(/\s*;\s*/).filter(Boolean).map((entry) => {
    const [instrument, reason = 'user excluded'] = entry.split(/\s*:\s*/);
    return { instrument: instrument.trim(), reason: reason.trim() || 'user excluded' };
  });
}

function applyAnswersToPortfolio(filePath, answers) {
  let text = fs.readFileSync(filePath, 'utf8');

  if (answers.portfolioName) {
    text = text.replace(/^# Portfolio:\s*.*$/m, `# Portfolio: ${answers.portfolioName}`);
  }
  if (answers.broker) text = replaceLine(text, 'Broker', answers.broker);
  if (answers.brokerAccountReference) {
    text = replaceLine(text, 'Broker account reference', answers.brokerAccountReference);
    text = removeOpenQuestion(text, 'Confirm broker account alias/reference.');
  }
  if (answers.baseCurrency) text = replaceLine(text, 'Base currency', answers.baseCurrency);
  if (answers.investmentHorizon) {
    text = replaceLine(text, 'Investment horizon', answers.investmentHorizon);
    text = removeOpenQuestion(text, 'Confirm investment horizon and maximum acceptable drawdown.');
  }
  if (answers.riskLevel) text = replaceLine(text, 'Risk level', answers.riskLevel);
  if (answers.maximumAcceptableDrawdown) {
    text = replaceLine(text, 'Maximum acceptable drawdown', answers.maximumAcceptableDrawdown);
    text = removeOpenQuestion(text, 'Confirm investment horizon and maximum acceptable drawdown.');
  }
  if (answers.esgPreference) text = replaceLine(text, 'ESG preference', answers.esgPreference);
  if (answers.executionMode) text = replaceLine(text, 'Execution mode', answers.executionMode);
  if (answers.initialCapital) {
    text = removeOpenQuestion(text, 'Confirm initial capital and expected portfolio size.');
    text = text.replace(
      '## Strategy Summary\nETF portfolio draft awaiting investor profile, approved ETF universe, and broker-account details.',
      `## Strategy Summary\nETF portfolio draft for approximately CHF ${answers.initialCapital}, awaiting final investor profile, approved ETF universe, and broker-account details.`
    );
  }
  if (Object.prototype.hasOwnProperty.call(answers, 'excludedInstruments')) {
    const rows = normalizeExcludedInstruments(answers.excludedInstruments);
    text = replaceExcludedInstrumentsTable(text, rows);
    if (answers.alreadyHeldInstruments || rows.length === 0) {
      text = removeOpenQuestion(text, 'Confirm any excluded or already-held instruments.');
    }
  }
  if (answers.alreadyHeldInstruments) {
    text = removeOpenQuestion(text, 'Confirm any excluded or already-held instruments.');
    if (/^- Already-held instruments note:/m.test(text)) {
      text = text.replace(/^- Already-held instruments note:\s*.*$/m, `- Already-held instruments note: ${answers.alreadyHeldInstruments}`);
    } else {
      text += `\n- Already-held instruments note: ${answers.alreadyHeldInstruments}\n`;
    }
  }

  fs.writeFileSync(filePath, text);
}

module.exports = { applyAnswersToPortfolio };
