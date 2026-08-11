/** Wall-clock date interpreted in a given UTC offset (minutes east of UTC). */

export interface LocalDateSpec {
  year: number;
  month: number;
  day: number;
  hour: number;
  min: number;
  sec: number;
  annual: boolean;
}

export function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  min: number,
  sec: number,
  offsetMin: number,
): number {
  return Date.UTC(year, month - 1, day, hour, min, sec, 0) - offsetMin * 60 * 1000;
}

/** Next occurrence of wall-clock date in the given timezone (for share links with lt=1). */
export function resolveLocalBornTime(spec: LocalDateSpec, offsetMin: number, now = Date.now()): number {
  if (spec.annual) {
    const localNow = new Date(now + offsetMin * 60 * 1000);
    let year = localNow.getUTCFullYear();
    let t = wallClockToUtc(year, spec.month, spec.day, spec.hour, spec.min, spec.sec, offsetMin);
    if (t <= now) {
      year += 1;
      t = wallClockToUtc(year, spec.month, spec.day, spec.hour, spec.min, spec.sec, offsetMin);
    }
    return t;
  }
  return wallClockToUtc(spec.year, spec.month, spec.day, spec.hour, spec.min, spec.sec, offsetMin);
}

export function formatLocalDateLabel(
  spec: LocalDateSpec,
  lang: 'ru' | 'en',
  months: string[],
  monthRp: string[],
): string {
  const monthName = lang === 'ru' ? monthRp[spec.month - 1] : months[spec.month - 1];
  const time = `${String(spec.hour).padStart(2, '0')}:${String(spec.min).padStart(2, '0')}`;
  if (spec.annual) {
    return lang === 'ru'
      ? `${spec.day} ${monthName}, ${time} (каждый год)`
      : `${monthName} ${spec.day}, ${time} (every year)`;
  }
  return lang === 'ru'
    ? `${spec.day} ${monthName} ${spec.year}, ${time}`
    : `${monthName} ${spec.day}, ${spec.year}, ${time}`;
}
