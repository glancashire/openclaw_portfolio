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
  if (answers.alreadyHeldInstruments) {
    text = removeOpenQuestion(text, 'Confirm any excluded or already-held instruments.');
    text += `\n- Already-held instruments note: ${answers.alreadyHeldInstruments}\n`;
  }

  fs.writeFileSync(filePath, text);
}

module.exports = { applyAnswersToPortfolio };
