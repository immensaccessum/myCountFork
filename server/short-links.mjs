/**
 * Short share links: POST /api/short stores {to,title,desc} and returns an id;
 * GET /s/:id serves an OG preview page that redirects to the stored counter URL.
 * Storage: JSON file (small scale, no DB needed).
 */
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOgHtml, requestOrigin } from './og-html.mjs';
import { renderOgCard } from './og-image.mjs';

const DEFAULT_PATH = join(dirname(fileURLToPath(import.meta.url)), '.data', 'short-links.json');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const ID_LEN = 6;
const MAX_LINKS = 100000;

export function createStore(path = DEFAULT_PATH) {
  let data = null;

  function load() {
    if (data) return data;
    try {
      data = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      data = { links: {}, byHash: {} };
    }
    return data;
  }

  function save() {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = path + '.tmp';
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, path);
  }

  function newId() {
    for (;;) {
      const bytes = randomBytes(ID_LEN);
      let id = '';
      for (let i = 0; i < ID_LEN; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
      if (!data.links[id]) return id;
    }
  }

  return {
    create({ to, title, desc }) {
      load();
      const hash = createHash('sha256').update(JSON.stringify([to, title, desc])).digest('hex');
      const existing = data.byHash[hash];
      if (existing && data.links[existing]) return existing;
      if (Object.keys(data.links).length >= MAX_LINKS) {
        throw new Error('short link store is full');
      }
      const id = newId();
      data.links[id] = { to, title, desc, ts: Date.now() };
      data.byHash[hash] = id;
      save();
      return id;
    },
    get(id) {
      load();
      return data.links[id] || null;
    },
  };
}

const defaultStore = createStore();

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

/** Validate payload; `to` must be a relative path to prevent open redirects. */
function validatePayload(body) {
  const to = String(body.to || '');
  const title = String(body.title || '').slice(0, 300);
  const desc = String(body.desc || title).slice(0, 300);
  if (!to.startsWith('/') || to.startsWith('//') || to.length > 2000) return null;
  if (!title) return null;
  return { to, title, desc };
}

/** Returns true if the request was handled. */
export async function handleShortRoutes(req, res, store = defaultStore) {
  const path = (req.url || '').split('?')[0];

  if (req.method === 'POST' && path === '/api/short') {
    try {
      const raw = await readBody(req);
      const payload = validatePayload(JSON.parse(raw));
      if (!payload) {
        sendJson(res, 400, { error: 'invalid payload' });
        return true;
      }
      const id = store.create(payload);
      sendJson(res, 200, { id });
    } catch (e) {
      sendJson(res, 400, { error: String(e && e.message ? e.message : e) });
    }
    return true;
  }

  const cardMatch = path.match(/^\/s\/([A-Za-z0-9]{4,16})\/card\.png$/);
  if (cardMatch && (req.method === 'GET' || req.method === 'HEAD')) {
    const link = store.get(cardMatch[1]);
    if (!link) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Not found');
      return true;
    }
    let png = null;
    try {
      png = await renderOgCard(link.title, link.desc);
    } catch {
      png = null;
    }
    if (!png) {
      res.statusCode = 302;
      res.setHeader('Location', '/og-card.png');
      res.end();
      return true;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(png);
    return true;
  }

  const m = path.match(/^\/s\/([A-Za-z0-9]{4,16})$/);
  if (m && (req.method === 'GET' || req.method === 'HEAD')) {
    const link = store.get(m[1]);
    if (!link) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Not found');
      return true;
    }
    const origin = requestOrigin(req);
    const html = buildOgHtml({
      title: link.title,
      description: link.desc,
      pageUrl: `${origin}/s/${m[1]}`,
      redirectUrl: `${origin}${link.to}`,
      imageUrl: `${origin}/s/${m[1]}/card.png`,
      imageWidth: 1200,
      imageHeight: 630,
      siteName: 'myCount',
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
    return true;
  }

  return false;
}
