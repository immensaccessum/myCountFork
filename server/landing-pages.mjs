import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(__dirname, 'data/landing-pages.json'), 'utf8'));

export const MSK_TZ_SEC = 3 * 3600;
const MSK_OFFSET_MS = MSK_TZ_SEC * 1000;

export function mskMidnight(year, month, day) {
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

function oneTimeMsk(year, month, day) {
  return mskMidnight(year, month, day);
}

/**
 * Orthodox Easter (Julian Gauss) converted to Gregorian calendar.
 * Returns { year, month, day } in the Gregorian calendar.
 */
export function orthodoxEaster(year) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;
  // Julian → Gregorian: +13 days for 1900–2099
  const jd = Date.UTC(year, julianMonth - 1, julianDay) + 13 * 86400000;
  const g = new Date(jd);
  return { year: g.getUTCFullYear(), month: g.getUTCMonth() + 1, day: g.getUTCDate() };
}

/** Maslenitsa Sunday = Easter − 56 days. */
export function maslenitsaSunday(year) {
  const e = orthodoxEaster(year);
  const t = Date.UTC(e.year, e.month - 1, e.day) - 56 * 86400000;
  const g = new Date(t);
  return { year: g.getUTCFullYear(), month: g.getUTCMonth() + 1, day: g.getUTCDate() };
}

function nextComputedMsk(rule) {
  const now = Date.now();
  let year = new Date(now + MSK_OFFSET_MS).getUTCFullYear();
  for (let i = 0; i < 3; i++) {
    const ymd = rule === 'maslenitsa' ? maslenitsaSunday(year) : orthodoxEaster(year);
    const t = mskMidnight(ymd.year, ymd.month, ymd.day);
    if (t > now) return t;
    year += 1;
  }
  const ymd = rule === 'maslenitsa' ? maslenitsaSunday(year) : orthodoxEaster(year);
  return mskMidnight(ymd.year, ymd.month, ymd.day);
}

/**
 * Resolve a dynamic rule to a UTC timestamp.
 * @param {string} rule
 * @param {number} [nowMs]
 * @param {number} [tzOffsetMin] minutes east of UTC (browser-style, e.g. 660 for +11)
 */
export function resolveDynamicRule(rule, nowMs = Date.now(), tzOffsetMin = 180) {
  const offsetMs = tzOffsetMin * 60 * 1000;
  const local = new Date(nowMs + offsetMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const dow = local.getUTCDay(); // 0=Sun … 6=Sat in local wall clock

  const localMidnightUtc = (yy, mm, dd) => Date.UTC(yy, mm, dd) - offsetMs;
  const localEndOfDayUtc = (yy, mm, dd) => Date.UTC(yy, mm, dd, 23, 59, 59) - offsetMs;

  const daysUntil = (targetDow) => {
    let delta = (targetDow - dow + 7) % 7;
    if (delta === 0) {
      // If it's already that weekday but past midnight start — still "today" at 00:00 only
      // for countdown-to-start-of-day we want the *next* occurrence when we're past 00:00.
      // For Friday etc. we aim at 00:00 local of that day; if today is Friday and now > 00:00,
      // jump to next week.
      const startToday = localMidnightUtc(y, m, d);
      if (nowMs >= startToday) delta = 7;
    }
    return delta;
  };

  switch (rule) {
    case 'next-friday': {
      const delta = daysUntil(5);
      return localMidnightUtc(y, m, d + delta);
    }
    case 'next-saturday': {
      const delta = daysUntil(6);
      return localMidnightUtc(y, m, d + delta);
    }
    case 'next-monday': {
      const delta = daysUntil(1);
      return localMidnightUtc(y, m, d + delta);
    }
    case 'end-of-day':
      return localEndOfDayUtc(y, m, d);
    case 'end-of-week': {
      // Sunday 23:59:59 local
      let delta = (0 - dow + 7) % 7;
      if (delta === 0) {
        const endToday = localEndOfDayUtc(y, m, d);
        if (nowMs >= endToday) delta = 7;
      }
      return localEndOfDayUtc(y, m, d + delta);
    }
    case 'end-of-month': {
      // last day of current month 23:59:59; if already past, next month
      const endThis = localEndOfDayUtc(y, m + 1, 0);
      if (nowMs < endThis) return endThis;
      return localEndOfDayUtc(y, m + 2, 0);
    }
    default:
      return nowMs;
  }
}

function monthTitle(lang, gen) {
  if (lang === 'ru') return `Сколько дней до ${gen} — точный счётчик онлайн`;
  return `How many days until ${gen} — online countdown`;
}

function monthDesc(lang, gen) {
  if (lang === 'ru') {
    return `Узнайте, сколько дней, часов, минут и секунд осталось до ${gen}. Бесплатный онлайн-счётчик с возможностью поделиться ссылкой.`;
  }
  return `Find out how many days, hours, minutes and seconds are left until ${gen}. Free online countdown you can share.`;
}

function seasonTitle(lang, gen) {
  if (lang === 'ru') return `Сколько дней до ${gen} — точный счётчик онлайн`;
  return `How many days until ${gen} — online countdown`;
}

function seasonDesc(lang, gen) {
  if (lang === 'ru') {
    return `Сколько дней осталось до начала ${gen}. Точный обратный отсчёт в днях, часах и минутах.`;
  }
  return `How many days are left until the start of ${gen}. Precise countdown in days, hours and minutes.`;
}

function catalogDescRu(gen, dateLabel) {
  return `Счётчик до ${dateLabel || gen}.`;
}

function catalogDescEn(gen, dateLabel) {
  return `Countdown to ${dateLabel || gen}.`;
}

function normalizeDef(raw) {
  return {
    kind: raw.kind || 'date',
    mode: raw.mode,
    rule: raw.rule,
    inCatalog: raw.inCatalog !== false && raw.kind !== 'tool' && raw.kind !== 'dynamic',
    id: raw.id,
    slugRu: raw.slugRu,
    slugEn: raw.slugEn,
    month: raw.month,
    day: raw.day,
    year: raw.year,
    annual: raw.annual,
    titleRu: raw.titleRu,
    titleEn: raw.titleEn,
    descRu: raw.descRu,
    descEn: raw.descEn,
    h1Ru: raw.h1Ru,
    h1En: raw.h1En,
    name: raw.name || { ru: raw.nameRu, en: raw.nameEn },
    bodyRu: raw.bodyRu || raw.descRu,
    bodyEn: raw.bodyEn || raw.descEn,
    catalogDesc: raw.catalogDesc,
    genRu: raw.genRu,
    genEn: raw.genEn,
  };
}

/** @returns {object[]} */
export function getLandingPageDefs() {
  const pages = [];

  for (const m of DATA.months) {
    const dateLabel = `1 ${m.genRu}`;
    pages.push(normalizeDef({
      id: m.id,
      kind: 'date',
      slugRu: m.slugRu,
      slugEn: m.slugEn,
      month: m.month,
      day: 1,
      annual: true,
      titleRu: monthTitle('ru', m.genRu),
      titleEn: monthTitle('en', m.genEn),
      descRu: monthDesc('ru', m.genRu),
      descEn: monthDesc('en', m.genEn),
      h1Ru: `Сколько дней до ${m.genRu}?`,
      h1En: `How many days until ${m.genEn}?`,
      name: { ru: m.nameRu, en: m.nameEn },
      bodyRu: monthDesc('ru', m.genRu),
      bodyEn: monthDesc('en', m.genEn),
      catalogDesc: { ru: catalogDescRu(m.genRu, dateLabel), en: catalogDescEn(m.genEn, `1 ${m.nameEn}`) },
    }));
  }

  for (const s of DATA.seasons) {
    pages.push(normalizeDef({
      id: s.id,
      kind: 'date',
      slugRu: s.slugRu,
      slugEn: s.slugEn,
      month: s.month,
      day: s.day,
      annual: true,
      titleRu: seasonTitle('ru', s.genRu),
      titleEn: seasonTitle('en', s.genEn),
      descRu: seasonDesc('ru', s.genRu),
      descEn: seasonDesc('en', s.genEn),
      h1Ru: `Сколько дней до ${s.genRu}?`,
      h1En: `How many days until ${s.genEn}?`,
      name: { ru: s.nameRu, en: s.nameEn },
      bodyRu: seasonDesc('ru', s.genRu),
      bodyEn: seasonDesc('en', s.genEn),
      catalogDesc: { ru: `Счётчик до начала ${s.genRu}.`, en: `Countdown to the start of ${s.genEn}.` },
    }));
  }

  for (const sp of DATA.special || []) {
    pages.push(normalizeDef({
      ...sp,
      kind: 'date',
      h1Ru: sp.h1Ru || `Сколько дней до ${sp.genRu}?`,
      h1En: sp.h1En || `How many days until ${sp.genEn}?`,
      name: { ru: sp.nameRu, en: sp.nameEn },
      bodyRu: sp.descRu,
      bodyEn: sp.descEn,
      catalogDesc: { ru: sp.descRu.split('.')[0] + '.', en: sp.descEn.split('.')[0] + '.' },
      annual: sp.annual !== false,
    }));
  }

  for (const t of DATA.tools || []) {
    pages.push(normalizeDef(t));
  }

  for (const d of DATA.dynamic || []) {
    pages.push(normalizeDef({
      ...d,
      h1Ru: d.h1Ru || `Сколько дней до ${d.genRu}?`,
      h1En: d.h1En || `How many days until ${d.genEn}?`,
      name: { ru: d.nameRu, en: d.nameEn },
      bodyRu: d.bodyRu || d.descRu,
      bodyEn: d.bodyEn || d.descEn,
      catalogDesc: { ru: d.descRu.split('.')[0] + '.', en: d.descEn.split('.')[0] + '.' },
    }));
  }

  for (const c of DATA.computed || []) {
    pages.push(normalizeDef({
      ...c,
      h1Ru: c.h1Ru || `Сколько дней до ${c.genRu}?`,
      h1En: c.h1En || `How many days until ${c.genEn}?`,
      name: { ru: c.nameRu, en: c.nameEn },
      bodyRu: c.bodyRu || c.descRu,
      bodyEn: c.bodyEn || c.descEn,
      catalogDesc: { ru: c.descRu.split('.')[0] + '.', en: c.descEn.split('.')[0] + '.' },
    }));
  }

  return pages;
}

/** Counter event payload for API / client. Returns null for tool pages (no fixed timestamp). */
export function landingEventFromDef(def) {
  if (def.kind === 'tool') return null;

  let t;
  let tz = MSK_TZ_SEC;

  if (def.kind === 'dynamic' && def.rule) {
    t = resolveDynamicRule(def.rule, Date.now(), 180);
    tz = MSK_TZ_SEC;
  } else if (def.kind === 'computed-annual' && def.rule) {
    t = nextComputedMsk(def.rule);
  } else if (def.annual === false && def.year) {
    t = oneTimeMsk(def.year, def.month, def.day);
  } else {
    t = nextAnnualMsk(def.month, def.day);
  }

  return {
    id: def.id,
    t,
    tz,
    source: 'landing',
    kind: def.kind,
    rule: def.rule,
    slug: { ru: def.slugRu, en: def.slugEn },
    name: def.name,
    desc: def.catalogDesc || { ru: def.bodyRu, en: def.bodyEn },
  };
}

export function getLandingEvents() {
  return getLandingPageDefs()
    .filter((d) => d.inCatalog)
    .map(landingEventFromDef)
    .filter(Boolean);
}

export function findLandingBySlug(slug, lang = 'ru') {
  const key = lang === 'en' ? 'slugEn' : 'slugRu';
  return getLandingPageDefs().find((p) => p[key] === slug) || null;
}

export function findLandingById(id) {
  return getLandingPageDefs().find((p) => p.id === id) || null;
}

export function popularLandingSlugs(lang = 'ru') {
  const key = lang === 'en' ? 'slugEn' : 'slugRu';
  const prefix = lang === 'en' ? '/until/' : '/do/';
  const order = lang === 'ru'
    ? [
        'proshlo-s-daty',
        'otpuska',
        'pyatnitsy',
        'dnej-mezhdu-datami',
        'avgusta',
        'sentyabrya',
        'novogo-goda',
        'dnej-do-daty',
        '1-sentyabrya',
        'kontsa-goda',
        '2027-goda',
        'pashi',
      ]
    : [
        'days-since-date',
        'vacation',
        'friday',
        'days-between-dates',
        'august',
        'september',
        'new-year',
        'days-until-date',
        'september-1',
        'end-of-year',
        'year-2027',
        'easter',
      ];
  const defs = getLandingPageDefs();
  const fromDefs = order
    .map((slug) => defs.find((d) => d[key] === slug))
    .filter(Boolean)
    .map((d) => ({
      slug: d[key],
      label: lang === 'ru' ? d.h1Ru.replace('?', '') : d.h1En.replace('?', ''),
      href: `${prefix}${d[key]}/`,
    }));
  // Between-dates is a standalone page, not in landing defs
  const extras =
    lang === 'ru'
      ? [{ slug: 'dnej-mezhdu-datami', label: 'Сколько дней между датами', href: '/do/dnej-mezhdu-datami/' }]
      : [{ slug: 'days-between-dates', label: 'How many days between dates', href: '/until/days-between-dates/' }];
  const merged = [];
  for (const slug of order) {
    const hit = fromDefs.find((x) => x.slug === slug) || extras.find((x) => x.slug === slug);
    if (hit) merged.push(hit);
  }
  return merged;
}
