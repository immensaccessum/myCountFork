/**
 * Parse counter URL params and compute a human-readable remaining/elapsed days line.
 */
const MSK_TZ_SEC = 3 * 3600;

function pluralRu(n, one, few, many) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

function daysLineRu(days, future) {
  const n = Math.abs(days);
  const word = pluralRu(n, 'день', 'дня', 'дней');
  return future ? `осталось ${n} ${word}` : `прошло ${n} ${word}`;
}

function daysLineEn(days, future) {
  const n = Math.abs(days);
  const word = n === 1 ? 'day' : 'days';
  return future ? `${n} ${word} left` : `${n} ${word} ago`;
}

function parseLocalSpec(params) {
  if (params.get('lt') !== '1') return null;
  const month = parseInt(params.get('lm') || '0', 10);
  const day = parseInt(params.get('ld') || '0', 10);
  if (!month || !day) return null;
  return {
    year: parseInt(params.get('ly') || '0', 10) || new Date().getFullYear(),
    month,
    day,
    hour: parseInt(params.get('lh') || '0', 10),
    min: parseInt(params.get('ln') || '0', 10),
    sec: parseInt(params.get('ls') || '0', 10),
    annual: params.get('la') === '1',
  };
}

function localWallToUtcMs(spec) {
  const now = new Date();
  let year = spec.year || now.getFullYear();
  const d = new Date(year, spec.month - 1, spec.day, spec.hour, spec.min, spec.sec, 0);
  if (spec.annual && d.getTime() <= Date.now()) {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.getTime();
}

function diffDays(targetMs, nowMs) {
  const DAY = 86400000;
  const future = targetMs > nowMs;
  const days = Math.round(Math.abs(targetMs - nowMs) / DAY);
  return { days, future };
}

export function countdownLineFromCounterPath(pathWithQuery, lang = 'ru', now = Date.now()) {
  const q = pathWithQuery.includes('?') ? pathWithQuery.slice(pathWithQuery.indexOf('?')) : '';
  const params = new URLSearchParams(q);
  const local = parseLocalSpec(params);
  let targetMs;
  if (local) {
    targetMs = localWallToUtcMs(local);
  } else {
    const t = params.get('t');
    if (!t) return null;
    targetMs = parseInt(t, 10);
  }
  if (!Number.isFinite(targetMs)) return null;
  const { days, future } = diffDays(targetMs, now);
  return lang === 'en' ? daysLineEn(days, future) : daysLineRu(days, future);
}

export function detectLangFromPath(path) {
  return path.startsWith('/en') ? 'en' : 'ru';
}
