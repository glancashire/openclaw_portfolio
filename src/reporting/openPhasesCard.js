const fs = require('fs');
const path = require('path');

const STATUS_ORDER = ['VERIFYING', 'STARTED', 'OPEN', 'PARTIAL', 'WAITING', 'PARKED'];

function normalizeStatus(value) {
  const text = String(value || '').trim().toUpperCase();
  if (!text) return 'OPEN';
  if (STATUS_ORDER.includes(text)) return text;
  return text;
}

function statusRank(status) {
  const idx = STATUS_ORDER.indexOf(normalizeStatus(status));
  return idx === -1 ? STATUS_ORDER.length : idx;
}

function normalizeTitleKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[—–-]/g, ' ')
    .replace(/[^a-z0-9§ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseVisualRoadmap(markdown = '') {
  const match = markdown.match(/## Visual roadmap[\s\S]*?```text\n([\s\S]*?)```/i);
  if (!match) return [];
  return String(match[1])
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => /\[[^\]]+\]/.test(line))
    .map((line) => {
      const itemMatch = line.match(/^(.+?)\s+\[([^\]]+)\]\s+(.+)$/);
      if (!itemMatch) return null;
      const [, titleRaw, statusRaw, progressRaw] = itemMatch;
      const title = titleRaw.trim();
      const status = normalizeStatus(statusRaw);
      const progress = (progressRaw || '').trim();
      const filled = (progress.match(/█/g) || []).length;
      const empty = (progress.match(/░/g) || []).length;
      const progressPct = filled + empty > 0 ? Math.round((filled / (filled + empty)) * 100) : null;
      return { title, status, progress, progressPct, titleKey: normalizeTitleKey(title) };
    })
    .filter(Boolean)
    .sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.title.localeCompare(b.title));
}

function parseDetailedSections(markdown = '') {
  const sections = String(markdown).split(/\n---\n/g);
  const byTitle = new Map();
  for (const block of sections) {
    const headerMatch = block.match(/^##\s+(.+)$/m);
    if (!headerMatch) continue;
    const title = headerMatch[1].trim();
    const statusMatch = block.match(/^\*\*Status:\*\*\s+(.+)$/mi);
    const status = normalizeStatus(statusMatch ? statusMatch[1].split(/\s+/)[0] : 'OPEN');
    const completed = [...block.matchAll(/^- \[x\]\s+(.+)$/gim)].map((m) => m[1].trim());
    const open = [...block.matchAll(/^- \[ \]\s+(.+)$/gim)].map((m) => m[1].trim());
    byTitle.set(normalizeTitleKey(title), { title, status, completed, open });
  }
  return byTitle;
}

function loadOpenPhasesCard({ repoRoot = process.cwd() } = {}) {
  // Prefer CURRENT_PLAN.md (post-2026-06-01 consolidation). Fall back to the
  // legacy OPEN_PHASES_OVERVIEW.md for callers / tests that still seed it.
  const candidates = [
    { rel: 'CURRENT_PLAN.md', generatedFrom: 'CURRENT_PLAN.md' },
    { rel: 'OPEN_PHASES_OVERVIEW.md', generatedFrom: 'OPEN_PHASES_OVERVIEW.md' },
  ];
  let chosen = null;
  for (const candidate of candidates) {
    const full = path.join(repoRoot, candidate.rel);
    if (fs.existsSync(full)) {
      chosen = { ...candidate, full };
      break;
    }
  }
  if (!chosen) {
    return { markdownPath: path.join(repoRoot, 'CURRENT_PLAN.md'), items: [], generatedFrom: 'missing' };
  }
  const markdown = fs.readFileSync(chosen.full, 'utf8');
  const roadmapItems = parseVisualRoadmap(markdown);
  const detailMap = parseDetailedSections(markdown);
  const items = roadmapItems.map((item) => {
    let detail = detailMap.get(item.titleKey) || null;
    if (!detail) {
      detail = [...detailMap.values()].find((candidate) => {
        const candidateKey = normalizeTitleKey(candidate.title);
        return candidateKey.includes(item.titleKey) || item.titleKey.includes(candidateKey);
      }) || null;
    }
    return {
      ...item,
      completed: detail?.completed || [],
      openItems: detail?.open || [],
    };
  });
  return {
    markdownPath: chosen.full,
    generatedFrom: chosen.generatedFrom,
    items,
  };
}

function renderOpenPhasesMarkdown(card = {}) {
  const items = Array.isArray(card.items) ? card.items : [];
  if (!items.length) {
    return '## Open Phases\n- No open phase items found.\n';
  }
  const lines = ['## Open Phases'];
  for (const item of items) {
    lines.push(`### ${item.title}`);
    lines.push(`- Status: ${item.status}`);
    if (typeof item.progressPct === 'number') lines.push(`- Progress: ${item.progressPct}%`);
    if (item.completed?.length) lines.push(`- Completed: ${item.completed.slice(0, 3).join('; ')}`);
    if (item.openItems?.length) lines.push(`- Still open: ${item.openItems.slice(0, 3).join('; ')}`);
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n`;
}

module.exports = {
  normalizeStatus,
  normalizeTitleKey,
  parseVisualRoadmap,
  parseDetailedSections,
  loadOpenPhasesCard,
  renderOpenPhasesMarkdown,
};
