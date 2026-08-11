#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function monthOptions(months) {
  return months.map((name, i) =>
    `\t\t\t<option value="${i}">${name}</option>`
  ).join('\n');
}

function metricLinks(hcInd, wm, metrics) {
  return metrics.map((label, i) =>
    `\t\t\t<li><a href="${hcInd}?wm=${wm}&inv=3&fid=${i + 1}" onclick="return prAr.eset('main_metric',${i + 1})" id="mf_met_tog_${i + 1}">${label}</a></li>`
  ).join('\n');
}

function applyStrings(tpl, s) {
  return tpl.replace(/\{\{STR:([a-zA-Z0-9_]+)\}\}/g, (_, key) => s[key] ?? '');
}

function buildPage({ outPath, base, hcInd, hcLang, strings }) {
  const tpl = readFileSync(join(root, 'src', 'template.html'), 'utf8');
  const otherLang = hcLang === 'ru' ? 'en' : 'ru';
  const langPrefix = hcInd.replace(/\/$/, '');

  let html = tpl
    .replace(/\{\{LANG\}\}/g, strings.lang)
    .replace(/\{\{TITLE\}\}/g, strings.title)
    .replace(/\{\{BASE\}\}/g, base)
    .replace(/\{\{ENGINE\}\}/g, `${base}engine/`)
    .replace(/\{\{CIMG\}\}/g, `${base}cimg/001/`)
    .replace(/\{\{HC_IND\}\}/g, hcInd)
    .replace(/\{\{HC_LANG\}\}/g, hcLang)
    .replace(/\{\{TXT_SCRIPT\}\}/g, `${base}engine/${hcLang}/script/txt.js`)
    .replace(/\{\{MONTH_OPTIONS\}\}/g, monthOptions(strings.months))
    .replace(/\{\{METRICS\}\}/g, metricLinks(langPrefix + '/', 3, strings.metrics))
    .replace(/\{\{LANG_OTHER\}\}/g, otherLang)
    .replace(/\{\{LANG_SELF\}\}/g, hcLang)
    .replace(/\{\{LOGO_ALT\}\}/g, strings.logoAlt)
    .replace(/\{\{STRINGS_JSON\}\}/g, JSON.stringify(strings).replace(/</g, '\\u003c'));

  html = applyStrings(html, strings);

  const dir = dirname(join(root, outPath));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, outPath), html);
  console.log('built', outPath);
}

const ru = loadJson(join(root, 'src/i18n/ru.json'));
const en = loadJson(join(root, 'src/i18n/en.json'));

buildPage({ outPath: 'ru/index.html', base: '../', hcInd: '/ru/', hcLang: 'ru', strings: ru });
buildPage({ outPath: 'en/index.html', base: '../', hcInd: '/en/', hcLang: 'en', strings: en });
buildPage({ outPath: 'index.html', base: '', hcInd: '/ru/', hcLang: 'ru', strings: ru });

writeFileSync(join(root, 'index.html'), readFileSync(join(root, 'index.html'), 'utf8').replace(
  '<body>',
  '<body>\n\t<script>if (!location.search && !location.hash) { const p = location.pathname.replace(/\\/?$/, \'\'); if (!p.endsWith(\'/ru\') && !p.endsWith(\'/en\')) location.replace(\'ru/\' + location.search + location.hash); }</script>'
), 'utf8');

console.log('done');
