#!/usr/bin/env node
/**
 * Post-build SEO: writes dist/ru/index.html, dist/en/index.html,
 * landing pages dist/do/<slug>/ and dist/until/<slug>/, plus sitemap.xml.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLandingPageDefs } from '../server/landing-pages.mjs';

const BASE_URL = 'https://app4.letovrf.ru';
const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

const PAGES = {
  ru: {
    locale: 'ru_RU',
    title: 'myCount — счётчик времени до даты, обратный отсчёт онлайн',
    desc: 'Бесплатный онлайн-счётчик времени: сколько дней, часов, минут и секунд осталось до Нового года, дня рождения или любой даты. Создайте счётчик и поделитесь ссылкой.',
    name: 'myCount — счётчик времени до даты',
  },
  en: {
    locale: 'en_US',
    title: 'myCount — countdown timer to any date online',
    desc: 'Free online countdown timer: days, hours, minutes and seconds until New Year, a birthday or any date. Create a counter and share the link.',
    name: 'myCount — countdown timer',
  },
};

function metaBlock(lang, { title, desc, url, altRu, altEn }) {
  const p = PAGES[lang];
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title || p.name,
    url,
    description: desc || p.desc,
    inLanguage: lang,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0' },
  });
  const pageTitle = title || p.title;
  const pageDesc = desc || p.desc;
  const ruAlt = altRu || `${BASE_URL}/ru/`;
  const enAlt = altEn || `${BASE_URL}/en/`;
  return `<title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="ru" href="${ruAlt}">
  <link rel="alternate" hreflang="en" href="${enAlt}">
  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/ru/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="myCount">
  <meta property="og:locale" content="${p.locale}">
  <meta property="og:image" content="${BASE_URL}/og-card.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <script type="application/ld+json">${jsonLd}</script>`;
}

function landingPresetScript(def, lang) {
  const h1 = lang === 'ru' ? def.h1Ru : def.h1En;
  const intro = lang === 'ru' ? def.bodyRu : def.bodyEn;
  return `<script>window.__MC_PRESET={eventId:${JSON.stringify(def.id)},wm:4,h1:${JSON.stringify(h1)},intro:${JSON.stringify(intro)}};</script>`;
}

/** Crawlers without JS still get an H1; visually hidden, no layout shift. */
function landingSeoBlock(h1, body) {
  return `<h1 class="sr-only">${h1}</h1>\n  <p class="sr-only">${body}</p>`;
}

const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!baseHtml.includes('<title>myCount</title>')) {
  throw new Error('dist/index.html: expected <title>myCount</title> marker not found');
}

const sitemapUrls = [];

for (const lang of Object.keys(PAGES)) {
  let html = baseHtml.replace('<title>myCount</title>', metaBlock(lang, { url: `${BASE_URL}/${lang}/` }));
  html = html.replace('<html lang="ru">', `<html lang="${lang}">`);
  mkdirSync(join(DIST, lang), { recursive: true });
  writeFileSync(join(DIST, lang, 'index.html'), html);
  sitemapUrls.push({
    loc: `${BASE_URL}/${lang}/`,
    altRu: `${BASE_URL}/ru/`,
    altEn: `${BASE_URL}/en/`,
  });
}

for (const def of getLandingPageDefs()) {
  for (const lang of ['ru', 'en']) {
    const slug = lang === 'ru' ? def.slugRu : def.slugEn;
    const prefix = lang === 'ru' ? 'do' : 'until';
    const url = `${BASE_URL}/${prefix}/${slug}/`;
    const altRu = `${BASE_URL}/do/${def.slugRu}/`;
    const altEn = `${BASE_URL}/until/${def.slugEn}/`;
    const title = lang === 'ru' ? def.titleRu : def.titleEn;
    const desc = lang === 'ru' ? def.descRu : def.descEn;
    const h1 = lang === 'ru' ? def.h1Ru : def.h1En;
    const body = lang === 'ru' ? def.bodyRu : def.bodyEn;
    let html = baseHtml.replace('<title>myCount</title>', metaBlock(lang, { title, desc, url, altRu, altEn }));
    html = html.replace('<html lang="ru">', `<html lang="${lang}">`);
    html = html.replace('<div id="app"></div>', `${landingSeoBlock(h1, body)}\n  <div id="app"></div>\n  ${landingPresetScript(def, lang)}`);
    const outDir = join(DIST, prefix, slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'index.html'), html);
    sitemapUrls.push({ loc: url, altRu, altEn });
  }
}

const now = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <xhtml:link rel="alternate" hreflang="ru" href="${u.altRu}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${u.altEn}"/>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

console.log(`SEO pages: ${sitemapUrls.length} URLs in sitemap`);
