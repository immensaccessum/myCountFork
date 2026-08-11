#!/usr/bin/env node
/**
 * Post-build SEO: writes dist/ru/index.html and dist/en/index.html with
 * language-specific title, description, canonical, hreflang, OG tags and
 * JSON-LD, plus dist/sitemap.xml. Crawlers get proper meta without JS.
 *
 * When the domain changes, update BASE_URL here and in public/robots.txt.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function metaBlock(lang) {
  const p = PAGES[lang];
  const url = `${BASE_URL}/${lang}/`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: p.name,
    url,
    description: p.desc,
    inLanguage: lang,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0' },
  });
  return `<title>${p.title}</title>
  <meta name="description" content="${p.desc}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="ru" href="${BASE_URL}/ru/">
  <link rel="alternate" hreflang="en" href="${BASE_URL}/en/">
  <link rel="alternate" hreflang="x-default" href="${BASE_URL}/ru/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${p.title}">
  <meta property="og:description" content="${p.desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="myCount">
  <meta property="og:locale" content="${p.locale}">
  <meta property="og:image" content="${BASE_URL}/og-card.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <script type="application/ld+json">${jsonLd}</script>`;
}

const baseHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!baseHtml.includes('<title>myCount</title>')) {
  throw new Error('dist/index.html: expected <title>myCount</title> marker not found');
}

for (const lang of Object.keys(PAGES)) {
  let html = baseHtml.replace('<title>myCount</title>', metaBlock(lang));
  html = html.replace('<html lang="ru">', `<html lang="${lang}">`);
  mkdirSync(join(DIST, lang), { recursive: true });
  writeFileSync(join(DIST, lang, 'index.html'), html);
}

const now = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${BASE_URL}/ru/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}/en/"/>
    <xhtml:link rel="alternate" hreflang="ru" href="${BASE_URL}/ru/"/>
  </url>
  <url>
    <loc>${BASE_URL}/en/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <xhtml:link rel="alternate" hreflang="ru" href="${BASE_URL}/ru/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}/en/"/>
  </url>
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);

console.log('SEO pages: dist/ru/index.html, dist/en/index.html, dist/sitemap.xml');
