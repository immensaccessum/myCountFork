/**
 * Parse counter URL params and compute a human-readable remaining/elapsed days line.
 */
import { buildEventsCatalog } from './events-catalog.mjs';

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
  const now = Date.now();
  let year = spec.year || new Date(now).getFullYear();
  const d = new Date(year, spec.month - 1, spec.day, spec.hour, spec.min, spec.sec, 0);
  if (spec.annual && d.getTime() <= now) {
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

function parseParams(pathWithQuery) {
  const q = pathWithQuery.includes('?') ? pathWithQuery.slice(pathWithQuery.indexOf('?')) : '';
  return new URLSearchParams(q);
}

function targetFromParams(params) {
  // Prefer instant t= over lt= — lt may be stale form data when eid is set.
  const t = params.get('t');
  if (t) {
    const ms = parseInt(t, 10);
    if (Number.isFinite(ms)) return ms;
  }
  const local = parseLocalSpec(params);
  if (local) return localWallToUtcMs(local);
  return null;
}

export function countdownLineFromCounterPath(pathWithQuery, lang = 'ru', now = Date.now()) {
  const targetMs = targetFromParams(parseParams(pathWithQuery));
  if (!Number.isFinite(targetMs)) return null;
  const { days, future } = diffDays(targetMs, now);
  return lang === 'en' ? daysLineEn(days, future) : daysLineRu(days, future);
}

/** Resolve eid via events catalog — fixes legacy links with wrong lt= params. */
export async function countdownLineFromCounterPathAsync(pathWithQuery, lang = 'ru', now = Date.now()) {
  const params = parseParams(pathWithQuery);
  const eid = params.get('eid');
  if (eid) {
    const cc = (params.get('cc') || (lang === 'en' ? 'US' : 'RU')).toUpperCase();
    try {
      const catalog = await buildEventsCatalog(cc);
      const ev = catalog.find((e) => e.id === eid);
      if (ev?.t) {
        const { days, future } = diffDays(ev.t, now);
        return lang === 'en' ? daysLineEn(days, future) : daysLineRu(days, future);
      }
    } catch {
      /* fall through */
    }
  }
  return countdownLineFromCounterPath(pathWithQuery, lang, now);
}

export function detectLangFromPath(path) {
  return path.startsWith('/en') ? 'en' : 'ru';
}
