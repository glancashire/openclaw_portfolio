const { readApprovedInstruments, readExcludedInstruments } = require('../analysis/approvedInstruments');

const VALID_ASSET_CLASSES = new Set(['Global equities', 'Swiss equities', 'Bonds / cash-like']);

function validateApprovedInstruments(portfolioPath) {
  const issues = [];
  const instruments = readApprovedInstruments(portfolioPath);
  if (!instruments.length) {
    issues.push({ severity: 'warning', filePath: portfolioPath, message: 'No approved instruments defined.' });
    return issues;
  }

  const excluded = readExcludedInstruments(portfolioPath);
  const excludedIds = new Set(excluded.map((instrument) => String(instrument.tickerOrIsin || '').trim().toUpperCase()).filter(Boolean));

  for (const instrument of instruments) {
    if (!instrument.tickerOrIsin) {
      issues.push({ severity: 'error', filePath: portfolioPath, message: 'Approved instrument row missing ticker/ISIN.' });
    }
    if (!VALID_ASSET_CLASSES.has(instrument.assetClass)) {
      issues.push({ severity: 'warning', filePath: portfolioPath, message: `Approved instrument ${instrument.tickerOrIsin || instrument.name} maps to non-MVP asset class: ${instrument.assetClass}` });
    }
    const hasAnyTargetField = [instrument.target, instrument.min, instrument.max].some((v) => v != null);
    const hasPartial = [instrument.target, instrument.min, instrument.max].filter((v) => v != null).length;
    if (hasAnyTargetField && hasPartial !== 3) {
      issues.push({ severity: 'warning', filePath: portfolioPath, message: `Approved instrument ${instrument.tickerOrIsin || instrument.name} has partial target/min/max values.` });
    }
    if (instrument.target != null && instrument.min != null && instrument.max != null) {
      if (!(instrument.min <= instrument.target && instrument.target <= instrument.max)) {
        issues.push({ severity: 'error', filePath: portfolioPath, message: `Approved instrument ${instrument.tickerOrIsin || instrument.name} has invalid min/target/max ordering.` });
      }
    }
    if (!instrument.exchange) {
      issues.push({ severity: 'info', filePath: portfolioPath, message: `Approved instrument ${instrument.tickerOrIsin || instrument.name} is missing exchange metadata.` });
    }
    if (excludedIds.has(String(instrument.tickerOrIsin || '').trim().toUpperCase())) {
      issues.push({ severity: 'error', filePath: portfolioPath, message: `Approved instrument ${instrument.tickerOrIsin || instrument.name} also appears in Excluded Instruments.` });
    }
  }

  return issues;
}

module.exports = { validateApprovedInstruments, VALID_ASSET_CLASSES };
