import type { CounterEvent } from './types';

const API = '/api/events';

let cachedCatalog: CounterEvent[] | null = null;
let cachedCountry = '';
let cachedAt = 0;
const MEM_TTL = 5 * 60 * 1000;

export function defaultCountryForLang(lang: 'ru' | 'en'): string {
  return lang === 'ru' ? 'RU' : 'US';
}

export function getStoredCountry(lang: 'ru' | 'en'): string {
  try {
    return localStorage.getItem('mc_event_country') || defaultCountryForLang(lang);
  } catch {
    return defaultCountryForLang(lang);
  }
}

export function setStoredCountry(cc: string): void {
  try {
    localStorage.setItem('mc_event_country', cc);
  } catch {
    /* ignore */
  }
}

export function getStaticEventCatalog(): CounterEvent[] {
  return [];
}

export async function loadEventCatalog(countryCode: string): Promise<CounterEvent[]> {
  const cc = countryCode.toUpperCase();
  if (cachedCatalog && cachedCountry === cc && Date.now() - cachedAt < MEM_TTL) {
    return cachedCatalog;
  }

  const res = await fetch(`${API}/${cc}`);
  if (!res.ok) throw new Error(`Events API: ${res.status}`);
  const data = (await res.json()) as CounterEvent[];

  cachedCatalog = data;
  cachedCountry = cc;
  cachedAt = Date.now();
  return data;
}

export function invalidateEventCatalog(): void {
  cachedCatalog = null;
  cachedCountry = '';
  cachedAt = 0;
}

export function findEventById(events: CounterEvent[], id: string): CounterEvent | undefined {
  return events.find((e) => e.id === id);
}

export function findEventIndex(events: CounterEvent[], id: string): number {
  const i = events.findIndex((e) => e.id === id);
  return i >= 0 ? i + 1 : 1;
}

export function eventAtIndex(events: CounterEvent[], wid: number): CounterEvent {
  const idx = Math.max(0, Math.min(events.length - 1, (wid || 1) - 1));
  return events[idx];
}
