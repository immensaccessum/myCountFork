/**
 * Server-side cache for Nager.Date API (shared by dev middleware and production server).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NAGER = 'https://date.nager.at/api/v3';
const TTL_MS = 24 * 60 * 60 * 1000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');

/** @type {Map<string, { at: number, data: unknown }>} */
const memory = new Map();

function cacheFileKey(key) {
  return path.join(CACHE_DIR, `${key.replace(/[^a-zA-Z0-9:_-]/g, '_')}.json`);
}

function readCache(key) {
  const mem = memory.get(key);
  if (mem && Date.now() - mem.at < TTL_MS) return mem.data;

  try {
    const raw = fs.readFileSync(cacheFileKey(key), 'utf8');
    const entry = JSON.parse(raw);
    if (Date.now() - entry.at > TTL_MS) return null;
    memory.set(key, entry);
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  const entry = { at: Date.now(), data };
  memory.set(key, entry);
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFileKey(key), JSON.stringify(entry));
  } catch {
    /* ignore disk errors */
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nager ${url}: ${res.status}`);
  return res.json();
}

export async function getCountries() {
  const key = 'countries';
  const cached = readCache(key);
  if (cached) return cached;

  const data = await fetchJson(`${NAGER}/AvailableCountries`);
  writeCache(key, data);
  return data;
}

export async function getHolidays(cc) {
  const country = String(cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error('Invalid country code');

  const key = `holidays:${country}`;
  const cached = readCache(key);
  if (cached) return cached;

  const year = new Date().getUTCFullYear();
  const [next, thisYear, nextYear] = await Promise.all([
    fetchJson(`${NAGER}/NextPublicHolidays/${country}`),
    fetchJson(`${NAGER}/PublicHolidays/${year}/${country}`),
    fetchJson(`${NAGER}/PublicHolidays/${year + 1}/${country}`),
  ]);

  const seen = new Set();
  /** @type {unknown[]} */
  const merged = [];
  for (const h of [...next, ...thisYear, ...nextYear]) {
    const item = /** @type {{ countryCode: string, date: string }} */ (h);
    const k = `${item.countryCode}:${item.date}`;
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(h);
  }

  writeCache(key, merged);
  return merged;
}
