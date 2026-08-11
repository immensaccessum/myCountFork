import { Base64 } from './base64';
import type { LocalDateSpec } from './local-date';

export type ViewMode = 1 | 3 | 4;
export type ShareMode = 'instant' | 'local';

export interface UrlState {
  wm: ViewMode;
  t?: number;
  tz?: number;
  fid?: number;
  t1?: string;
  t2?: string;
  wid?: number;
  eid?: string;
  cc?: string;
  /** New: local wall-clock target (lt=1). Old links without lt use t+tz only. */
  lt?: boolean;
  local?: LocalDateSpec;
}

export interface ShareParams {
  basePath: string;
  bornTime: number;
  getTZ: () => number;
  format: number;
  text1: string;
  text2: string;
  eid?: string;
  cc?: string;
  wm?: ViewMode;
  omitTz?: boolean;
  shareMode?: ShareMode;
  local?: LocalDateSpec;
}

function parseLocalSpec(params: URLSearchParams): LocalDateSpec | undefined {
  if (params.get('lt') !== '1') return undefined;
  const year = parseInt(params.get('ly') || '0', 10);
  const month = parseInt(params.get('lm') || '0', 10);
  const day = parseInt(params.get('ld') || '0', 10);
  if (!month || !day) return undefined;
  return {
    year: year || new Date().getFullYear(),
    month,
    day,
    hour: parseInt(params.get('lh') || '0', 10),
    min: parseInt(params.get('ln') || '0', 10),
    sec: parseInt(params.get('ls') || '0', 10),
    annual: params.get('la') === '1',
  };
}

/** Max length for user texts (t1/t2): keeps the URL compact and the OG card readable. */
export const MAX_SHARE_TEXT = 80;
/** Hard cap when reading texts from foreign/legacy URLs. */
const MAX_PARSED_TEXT = 200;

function decodeShareText(raw: string): string {
  let value = raw;
  // Legacy links: encodeURIComponent was applied before URLSearchParams (double-encoded %XX).
  if (/%[0-9A-Fa-f]{2}/.test(value)) {
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep raw */
    }
  }
  return Base64.decode(value).slice(0, MAX_PARSED_TEXT);
}

export function parseUrlState(search: string): UrlState {
  const state: UrlState = { wm: 3 };
  if (!search || search.length < 2) return state;
  const params = new URLSearchParams(search);
  const wm = parseInt(params.get('wm') || '3', 10);
  if (wm === 1 || wm === 3 || wm === 4) state.wm = wm;
  const t = params.get('t');
  if (t) state.t = parseInt(t, 10);
  const tz = params.get('tz');
  if (tz !== null && tz !== '') state.tz = parseInt(tz, 10);
  const fid = params.get('fid');
  if (fid) state.fid = parseInt(fid, 10);
  const wid = params.get('wid');
  if (wid) state.wid = parseInt(wid, 10);
  const eid = params.get('eid') || params.get('event');
  if (eid) state.eid = eid;
  const cc = params.get('cc');
  if (cc) state.cc = cc.toUpperCase();
  const t1 = params.get('t1');
  if (t1) state.t1 = decodeShareText(t1);
  const t2 = params.get('t2');
  if (t2) state.t2 = decodeShareText(t2);
  const local = parseLocalSpec(params);
  if (local) {
    state.lt = true;
    state.local = local;
  }
  return state;
}

export function buildAppShareUrl(params: ShareParams): string {
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const wm = params.wm ?? 4;
  const q = new URLSearchParams();
  q.set('wm', String(wm));
  q.set('fid', String(params.format));

  if (params.shareMode === 'local' && params.local) {
    q.set('lt', '1');
    q.set('ly', String(params.local.year));
    q.set('lm', String(params.local.month));
    q.set('ld', String(params.local.day));
    q.set('lh', String(params.local.hour));
    q.set('ln', String(params.local.min));
    q.set('ls', String(params.local.sec));
    if (params.local.annual) q.set('la', '1');
  } else {
    q.set('t', String(params.bornTime));
    if (!params.omitTz) {
      q.set('tz', String(params.getTZ()));
    }
  }

  if (params.text1) q.set('t1', Base64.encode(params.text1.slice(0, MAX_SHARE_TEXT)));
  if (params.text2) q.set('t2', Base64.encode(params.text2.slice(0, MAX_SHARE_TEXT)));
  if (params.eid) q.set('eid', params.eid);
  if (params.cc) q.set('cc', params.cc);

  return `${origin}${params.basePath}?${q.toString()}`;
}

/** URL for messengers (Telegram): /og/ path returns Open Graph HTML, then redirects to the app. */
export function buildOgShareUrl(
  lang: 'ru' | 'en',
  appUrl: string,
  title: string,
  description: string,
): string {
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const q = new URLSearchParams();
  q.set('to', appUrl);
  q.set('title', title);
  q.set('desc', description);
  q.set('ogv', '2');
  return `${origin}/og/${lang}/?${q.toString()}`;
}

export function buildShareUrl(
  basePath: string,
  bornTime: number,
  getTZ: () => number,
  format: number,
  text1: string,
  text2: string,
): string {
  return buildAppShareUrl({ basePath, bornTime, getTZ, format, text1, text2 });
}

export function detectLang(pathname: string): 'ru' | 'en' {
  if (pathname.startsWith('/en') || pathname.startsWith('/until/')) return 'en';
  return 'ru';
}

export function langBasePath(lang: 'ru' | 'en'): string {
  return `/${lang}/`;
}

export function parseOgQuery(search: string): { to: string; title: string; desc: string } | null {
  if (!search || search.length < 2) return null;
  const params = new URLSearchParams(search);
  const to = params.get('to');
  const title = params.get('title');
  if (!to || !title) return null;
  return { to, title, desc: params.get('desc') || title };
}
