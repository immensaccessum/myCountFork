/**
 * Dynamic OG card (1200x630 PNG): counter title + date rendered over the dark card.
 * Uses sharp (SVG -> PNG). If sharp is unavailable, callers fall back to the static og-card.png.
 */

let sharpPromise = null;
function getSharp() {
  if (!sharpPromise) {
    sharpPromise = import('sharp').then(
      (m) => m.default,
      () => null,
    );
  }
  return sharpPromise;
}

const W = 1200;
const H = 630;
const CACHE_MAX = 200;
const cache = new Map();

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Greedy word wrap; long words are hard-broken. */
function wrapText(text, maxChars, maxLines) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word.length > maxChars ? word.slice(0, maxChars - 1) + '…' : word;
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/…?$/, '…');
  }
  return lines;
}

function buildSvg(title, subtitle, countdown) {
  const titleFont = title.length > 60 ? 52 : 62;
  // DejaVu Sans Bold averages ~0.64em per char; keep 80px margins on both sides.
  const maxChars = Math.floor(1040 / (titleFont * 0.64));
  const titleLines = wrapText(title, maxChars, 3);
  const subLines = subtitle && subtitle !== title ? wrapText(subtitle, 46, 2) : [];
  const countLines = countdown ? wrapText(countdown, 40, 1) : [];

  const lineH = titleFont * 1.25;
  const subH = subLines.length * 46;
  const countH = countLines.length * 40;
  const blockH = titleLines.length * lineH + (subLines.length ? subH + 28 : 0) + (countLines.length ? countH + 16 : 0);
  let y = (H - blockH) / 2 + titleFont * 0.6 + 30;

  let text = '';
  for (const line of titleLines) {
    text += `<text x="80" y="${y.toFixed(0)}" font-family="DejaVu Sans, sans-serif" font-size="${titleFont}" font-weight="bold" fill="#f2f2f5">${escXml(line)}</text>`;
    y += lineH;
  }
  if (subLines.length) {
    y += 8;
    for (const line of subLines) {
      text += `<text x="80" y="${y.toFixed(0)}" font-family="DejaVu Sans, sans-serif" font-size="36" fill="#a9a9b5">${escXml(line)}</text>`;
      y += 46;
    }
  }
  if (countLines.length) {
    y += 12;
    for (const line of countLines) {
      text += `<text x="80" y="${y.toFixed(0)}" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="bold" fill="#e8452c">${escXml(line)}</text>`;
      y += 40;
    }
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#181822"/>
      <stop offset="0.5" stop-color="#20202c"/>
      <stop offset="1" stop-color="#14141c"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="10" fill="#e8452c"/>
  <text x="80" y="96" font-family="DejaVu Sans, sans-serif" font-size="40" font-weight="bold" fill="#f2f2f5">my<tspan fill="#e8452c">Count</tspan></text>
  <text x="80" y="${H - 56}" font-family="DejaVu Sans, sans-serif" font-size="30" fill="#77778a">Счётчик времени до даты</text>
  ${text}
</svg>`;
}

/** Returns a PNG buffer or null when sharp is unavailable. */
export async function renderOgCard(title, subtitle, countdown) {
  const sharp = await getSharp();
  if (!sharp) return null;

  const key = JSON.stringify([title, subtitle, countdown]);
  const hit = cache.get(key);
  if (hit) return hit;

  const svg = buildSvg(title, subtitle, countdown);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  if (cache.size >= CACHE_MAX) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(key, png);
  return png;
}
