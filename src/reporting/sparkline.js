'use strict';

/**
 * Inline-SVG sparkline. Pure-render, no JS dependencies.
 * Designed to work inside HTML pages AND emails (Mailgun-friendly).
 */

function buildSparklineSvg(values = [], opts = {}) {
  const {
    width = 240,
    height = 48,
    padding = 4,
    strokeColor = '#1d4ed8',
    fillColor = 'rgba(29, 78, 216, 0.10)',
    strokeWidth = 1.6,
    showEndDot = true,
  } = opts;

  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="${width / 2}" y="${height / 2 + 4}" text-anchor="middle" font-size="11" fill="#9ca3af">no data</text></svg>`;
  }
  if (finite.length === 1) {
    const cy = height / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><line x1="${padding}" y1="${cy}" x2="${width - padding}" y2="${cy}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/><circle cx="${width - padding}" cy="${cy}" r="${strokeWidth + 0.4}" fill="${strokeColor}"/></svg>`;
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = (max - min) || 1; // avoid div-by-0
  const innerWidth = width - 2 * padding;
  const innerHeight = height - 2 * padding;
  const step = innerWidth / (finite.length - 1);

  const points = finite.map((v, i) => {
    const x = padding + i * step;
    const y = padding + innerHeight - ((v - min) / range) * innerHeight;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  const fillPath = `${path} L${points[points.length - 1][0]} ${height - padding} L${points[0][0]} ${height - padding} Z`;

  const lastDot = showEndDot
    ? `<circle cx="${points[points.length - 1][0]}" cy="${points[points.length - 1][1]}" r="${strokeWidth + 0.4}" fill="${strokeColor}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<path d="${fillPath}" fill="${fillColor}" stroke="none"/>` +
    `<path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `${lastDot}</svg>`;
}

module.exports = { buildSparklineSvg };
