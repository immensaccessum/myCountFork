import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getHolidays } from './nager-cache.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data/calendar');

const SKIP_HOLIDAY_NAMES = new Set(['Новогодние каникулы', 'New Year holiday']);
const MSK_TZ_SEC = 3 * 3600;
const MSK_OFFSET_MS = MSK_TZ_SEC * 1000;

const SOURCE_RANK = { history: 0, annual: 1, milestone: 2, holiday: 3 };

/** @type {Map<string, { at: number, data: unknown }>} */
const catalogCache = new Map();
const CATALOG_TTL = 15 * 60 * 1000;

function readCalendarFile(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Calendar date at 00:00 Moscow → UTC ms. */
function mskMidnight(year, month, day) {
  return Date.UTC(year, month - 1, day, 0, 0, 0, 0) - MSK_OFFSET_MS;
}

function nextAnnualMsk(month, day) {
  const now = Date.now();
  let year = new Date(now + MSK_OFFSET_MS).getUTCFullYear();
  let t = mskMidnight(year, month, day);
  if (t <= now) {
    year += 1;
    t = mskMidnight(year, month, day);
  }
  return t;
}

function nextRoundSeconds(step) {
  const now = Date.now();
  return Math.ceil(now / 1000 / step) * step * 1000;
}

function getMilestones() {
  return [
    {
      id: 'milestone:new-year',
      t: nextAnnualMsk(1, 1),
      tz: MSK_TZ_SEC,
      source: 'milestone',
      name: { ru: 'Новый год', en: "New Year's Day" },
      desc: {
        ru: '1 января, 00:00 по Москве (МСК).',
        en: 'January 1 at 00:00 Moscow time (MSK).',
      },
    },
    {
      id: 'milestone:unix-100m',
      t: nextRoundSeconds(1e8),
      tz: 0,
      source: 'milestone',
      name: { ru: '100 миллионов секунд Unix', en: '100 million Unix seconds' },
      desc: {
        ru: 'Ближайший рубеж в 100 000 000 секунд от Unix epoch (UTC).',
        en: 'The next 100,000,000 seconds milestone since Unix epoch (UTC).',
      },
    },
    {
      id: 'milestone:unix-2b',
      t: nextRoundSeconds(2e9),
      tz: 0,
      source: 'milestone',
      name: { ru: '2 миллиарда секунд Unix', en: '2 billion Unix seconds' },
      desc: {
        ru: 'Ближайший рубеж в 2 000 000 000 секунд от Unix epoch (UTC).',
        en: 'The next 2,000,000,000 seconds milestone since Unix epoch (UTC).',
      },
    },
  ];
}

function historyItems(entries) {
  return (entries || []).map((e) => ({
    id: e.id,
    t: Date.parse(e.at),
    tz: e.tz ?? 0,
    source: 'history',
    name: e.name,
    desc: e.desc,
  }));
}

function annualItems(entries, useMsk) {
  return (entries || []).map((e) => ({
    id: e.id,
    t: useMsk ? nextAnnualMsk(e.month, e.day) : nextAnnualUtc(e.month, e.day, e.hour || 0, e.min || 0),
    tz: useMsk ? MSK_TZ_SEC : 0,
    source: 'annual',
    name: e.name,
    desc: e.desc,
  }));
}

function nextAnnualUtc(month, day, hour = 0, min = 0) {
  const now = Date.now();
  let year = new Date().getUTCFullYear();
  let t = Date.UTC(year, month - 1, day, hour, min, 0, 0);
  if (t <= now) {
    year += 1;
    t = Date.UTC(year, month - 1, day, hour, min, 0, 0);
  }
  return t;
}

function holidaySlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);
}

function parseHolidayDateMsk(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return mskMidnight(y, m, d);
}

async function holidayItems(cc) {
  const raw = await getHolidays(cc);
  const useMsk = cc === 'RU';
  const todayMsk = new Date(Date.now() + MSK_OFFSET_MS);
  const todayStart = mskMidnight(
    todayMsk.getUTCFullYear(),
    todayMsk.getUTCMonth() + 1,
    todayMsk.getUTCDate(),
  );
  const seen = new Set();
  const out = [];

  for (const h of raw) {
    const local = h.localName || h.name;
    const en = h.name || h.localName;
    if (SKIP_HOLIDAY_NAMES.has(local) || SKIP_HOLIDAY_NAMES.has(en)) continue;

    const key = h.date;
    if (seen.has(key)) continue;
    seen.add(key);

    const t = useMsk ? parseHolidayDateMsk(h.date) : Date.parse(`${h.date}T00:00:00.000Z`);
    if (t < todayStart - 86400000) continue;

    out.push({
      id: `holiday:${cc}:${h.date}:${holidaySlug(en)}`,
      t,
      tz: useMsk ? MSK_TZ_SEC : 0,
      source: 'holiday',
      countryCode: cc,
      name: { ru: local, en },
      desc: {
        ru: useMsk
          ? `Официальный праздник ${h.date} — ${local} (полночь, МСК).`
          : `Официальный праздник ${h.date} — ${local}.`,
        en: useMsk
          ? `Public holiday on ${h.date} — ${en} (midnight MSK).`
          : `Public holiday on ${h.date} — ${en}.`,
      },
    });
  }

  return out;
}

function eventDayKey(e) {
  if (e.tz === MSK_TZ_SEC) {
    const msk = new Date(e.t + MSK_OFFSET_MS);
    return `${msk.getUTCFullYear()}-${msk.getUTCMonth() + 1}-${msk.getUTCDate()}`;
  }
  return new Date(e.t).toISOString().slice(0, 10);
}

export function mergeEventItems(items) {
  const byDay = new Map();

  for (const e of items) {
    const day = eventDayKey(e);
    const prev = byDay.get(day);
    if (!prev || SOURCE_RANK[e.source] < SOURCE_RANK[prev.source]) {
      byDay.set(day, e);
    }
  }

  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

export async function buildEventsCatalog(cc) {
  const country = cc.toUpperCase();
  const useMsk = country === 'RU';
  const cacheKey = `catalog:${country}`;
  const cached = catalogCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CATALOG_TTL) {
    return cached.data;
  }

  const global = readCalendarFile('global');
  let local = { history: [], annual: [] };
  try {
    local = readCalendarFile(country.toLowerCase());
  } catch {
    /* no country overlay */
  }

  const all = mergeEventItems([
    ...historyItems(global.history),
    ...historyItems(local.history),
    ...annualItems(global.annual, false),
    ...annualItems(local.annual, useMsk),
    ...getMilestones(),
    ...(await holidayItems(country)),
  ]);

  catalogCache.set(cacheKey, { at: Date.now(), data: all });
  return all;
}
