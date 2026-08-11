export type EventSource = 'history' | 'annual' | 'milestone' | 'holiday' | 'landing';

export interface CounterEvent {
  id: string;
  t: number;
  tz: number;
  name: { ru: string; en: string };
  desc: { ru: string; en: string };
  source: EventSource;
  countryCode?: string;
  slug?: { ru: string; en: string };
}

export interface NagerCountry {
  countryCode: string;
  name: string;
}

export interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types?: string[];
}

/** Pick the list item closest to «now» as the default selection. */
export function defaultEventIndex(events: CounterEvent[]): number {
  if (!events.length) return 1;
  const now = Date.now();
  let best = 0;
  let bestDist = Infinity;
  events.forEach((e, i) => {
    const d = Math.abs(e.t - now);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best + 1;
}

export function isEventFuture(t: number, now = Date.now()): boolean {
  return t > now;
}
