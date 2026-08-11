/** UTC offsets in minutes (same list as legacy). */
export const TZ_OFFSETS_MIN = [
  -720, -660, -600, -540, -480, -420, -360, -300, -270, -240, -210, -180, -120, -60,
  0, 60, 120, 180, 210, 240, 270, 300, 330, 345, 360, 390, 420, 480, 540, 570, 600, 660, 720, 780,
];

export type TzMode = 1 | 2 | 3 | 4;

export function browserTzOffsetMin(): number {
  return -new Date().getTimezoneOffset();
}

export function formatUtcOffset(min: number): string {
  if (min === 0) return '(UTC)';
  const sign = min > 0 ? '+' : '-';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const mm = m < 10 ? '0' + m : String(m);
  return `(UTC ${sign}${h}:${mm})`;
}

export function defaultTzPacked(): number {
  const min = browserTzOffsetMin();
  // ent=4 (точность до секунды): наши ссылки всегда несут точный момент.
  return (min * 60) | (1 << 16) | (4 << 18);
}

/** Moscow Standard Time (UTC+3), no DST. */
export const MSK_TZ_SEC = 3 * 3600;

export function mskWallClockToUtc(year: number, month: number, day: number, hour = 0, min = 0): number {
  return Date.UTC(year, month - 1, day, hour, min, 0, 0) - MSK_TZ_SEC * 1000;
}

export function formatMskLabel(): string {
  return '(МСК)';
}

export function gmtToSeconds(h: number, min: number, s: number): number {
  const sign = h < 0 ? -1 : 1;
  return h * 3600 + sign * Math.abs(min) * 60 + sign * Math.abs(s);
}

export function secondsToGmt(tzSec: number): { h: number; min: number; s: number } {
  const sign = tzSec < 0 ? -1 : 1;
  const abs = Math.abs(tzSec);
  const h = sign * Math.floor(abs / 3600);
  const rest = abs % 3600;
  const min = Math.floor(rest / 60);
  const s = rest % 60;
  return { h, min, s };
}

export function inferTzMode(tzen: number, isGMT: number, tzunk: number): TzMode {
  if (tzunk) return 4;
  if (!tzen) return 3;
  if (isGMT) return 2;
  return 1;
}
