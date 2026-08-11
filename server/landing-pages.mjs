import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(__dirname, 'data/landing-pages.json'), 'utf8'));

const MSK_TZ_SEC = 3 * 3600;
const MSK_OFFSET_MS = MSK_TZ_SEC * 1000;

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

function oneTimeMsk(year, month, day) {
  return mskMidnight(year, month, day);
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

/** @returns {import('./events-catalog.mjs').LandingEventDef[]} */
export function getLandingPageDefs() {
  const pages = [];

  for (const m of DATA.months) {
    const dateLabel = `1 ${m.genRu}`;
    pages.push({
      id: m.id,
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
    });
  }

  for (const s of DATA.seasons) {
    pages.push({
      id: s.id,
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
    });
  }

  for (const sp of DATA.special) {
    pages.push({
      id: sp.id,
      slugRu: sp.slugRu,
      slugEn: sp.slugEn,
      month: sp.month,
      day: sp.day,
      year: sp.year,
      annual: sp.annual !== false,
      titleRu: sp.titleRu,
      titleEn: sp.titleEn,
      descRu: sp.descRu,
      descEn: sp.descEn,
      h1Ru: `Сколько дней до ${sp.genRu}?`,
      h1En: `How many days until ${sp.genEn}?`,
      name: { ru: sp.nameRu, en: sp.nameEn },
      bodyRu: sp.descRu,
      bodyEn: sp.descEn,
      catalogDesc: { ru: sp.descRu.split('.')[0] + '.', en: sp.descEn.split('.')[0] + '.' },
    });
  }

  return pages;
}

/** Counter event payload for API / client. */
export function landingEventFromDef(def) {
  const t = def.annual === false && def.year
    ? oneTimeMsk(def.year, def.month, def.day)
    : nextAnnualMsk(def.month, def.day);
  return {
    id: def.id,
    t,
    tz: MSK_TZ_SEC,
    source: 'landing',
    slug: { ru: def.slugRu, en: def.slugEn },
    name: def.name,
    desc: def.catalogDesc || { ru: def.bodyRu, en: def.bodyEn },
  };
}

export function getLandingEvents() {
  return getLandingPageDefs().map(landingEventFromDef);
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
    ? ['avgusta', 'sentyabrya', 'iyulya', 'leta', 'novogo-goda', 'oktyabrya', 'noyabrya', 'iyunya', 'dekabrya', '1-sentyabrya', 'kontsa-goda', '2027-goda']
    : ['august', 'september', 'july', 'summer', 'new-year', 'october', 'november', 'june', 'december', 'september-1', 'end-of-year', 'year-2027'];
  const defs = getLandingPageDefs();
  return order
    .map((slug) => defs.find((d) => d[key] === slug))
    .filter(Boolean)
    .map((d) => ({ slug: d[key], label: lang === 'ru' ? d.h1Ru.replace('?', '') : d.h1En.replace('?', ''), href: `${prefix}${d[key]}/` }));
}
