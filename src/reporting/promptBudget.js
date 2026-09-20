'use strict';

const DEFAULT_BUDGETS = Object.freeze({
  tiny: 64,
  small: 128,
  medium: 256,
  large: 512,
});

function clampBudget(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.floor(numeric));
}

function budgetForTask(task = 'medium', override = null) {
  if (override != null) return clampBudget(override, DEFAULT_BUDGETS.medium);
  return DEFAULT_BUDGETS[task] || DEFAULT_BUDGETS.medium;
}

function compactText(text, maxChars) {
  const limit = clampBudget(maxChars, 0);
  if (!limit || typeof text !== 'string') return text || '';
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function shortList(items = [], limit = 5) {
  return Array.isArray(items) ? items.slice(0, Math.max(0, limit)) : [];
}

module.exports = { DEFAULT_BUDGETS, budgetForTask, compactText, shortList };
