import { getCountries, getHolidays } from './nager-cache.mjs';
import { buildEventsCatalog } from './events-catalog.mjs';
import { findLandingById, findLandingBySlug, getLandingPageDefs, landingEventFromDef, popularLandingSlugs } from './landing-pages.mjs';

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=900');
  res.end(JSON.stringify(data));
}

export async function handleApiRequest(req, res, next) {
  const url = req.url || '';
  const path = url.split('?')[0];

  if (path === '/api/nager/countries') {
    try {
      const data = await getCountries();
      sendJson(res, 200, data);
    } catch (e) {
      sendJson(res, 502, { error: String(e) });
    }
    return;
  }

  const hm = path.match(/^\/api\/nager\/holidays\/([A-Za-z]{2})$/);
  if (hm) {
    try {
      const data = await getHolidays(hm[1]);
      sendJson(res, 200, data);
    } catch (e) {
      sendJson(res, 502, { error: String(e) });
    }
    return;
  }

  const em = path.match(/^\/api\/events\/([A-Za-z]{2})$/);
  if (em) {
    try {
      const data = await buildEventsCatalog(em[1]);
      sendJson(res, 200, data);
    } catch (e) {
      sendJson(res, 502, { error: String(e) });
    }
    return;
  }

  if (path === '/api/landing-pages') {
    const lang = (url.split('?')[1] && new URLSearchParams(url.split('?')[1]).get('lang')) || 'ru';
    sendJson(res, 200, { pages: getLandingPageDefs(), popular: popularLandingSlugs(lang) });
    return;
  }

  const lm = path.match(/^\/api\/landing\/([^/?#]+)$/);
  if (lm) {
    const lang = (url.split('?')[1] && new URLSearchParams(url.split('?')[1]).get('lang')) || 'ru';
    const key = decodeURIComponent(lm[1]);
    const def = findLandingBySlug(key, lang) || findLandingById(key);
    if (!def) {
      sendJson(res, 404, { error: 'not found' });
      return;
    }
    const ev = landingEventFromDef(def);
    if (!ev) {
      sendJson(res, 404, { error: 'tool page has no fixed event' });
      return;
    }
    sendJson(res, 200, ev);
    return;
  }

  if (path === '/api/health') {
    sendJson(res, 200, { ok: true, uptime: process.uptime() });
    return;
  }

  next();
}
