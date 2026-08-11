/**
 * Resolve a dynamic countdown rule to a UTC timestamp in the given timezone.
 * @param rule e.g. next-friday, end-of-day
 * @param nowMs
 * @param tzOffsetMin minutes east of UTC (e.g. browserTzOffsetMin())
 */
export function resolveDynamicRule(
  rule: string,
  nowMs = Date.now(),
  tzOffsetMin = -new Date().getTimezoneOffset(),
): number {
  const offsetMs = tzOffsetMin * 60 * 1000;
  const local = new Date(nowMs + offsetMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const dow = local.getUTCDay();

  const localMidnightUtc = (yy: number, mm: number, dd: number) => Date.UTC(yy, mm, dd) - offsetMs;
  const localEndOfDayUtc = (yy: number, mm: number, dd: number) =>
    Date.UTC(yy, mm, dd, 23, 59, 59) - offsetMs;

  const daysUntil = (targetDow: number) => {
    let delta = (targetDow - dow + 7) % 7;
    if (delta === 0) {
      const startToday = localMidnightUtc(y, m, d);
      if (nowMs >= startToday) delta = 7;
    }
    return delta;
  };

  switch (rule) {
    case 'next-friday':
      return localMidnightUtc(y, m, d + daysUntil(5));
    case 'next-saturday':
      return localMidnightUtc(y, m, d + daysUntil(6));
    case 'next-monday':
      return localMidnightUtc(y, m, d + daysUntil(1));
    case 'end-of-day':
      return localEndOfDayUtc(y, m, d);
    case 'end-of-week': {
      let delta = (0 - dow + 7) % 7;
      if (delta === 0) {
        const endToday = localEndOfDayUtc(y, m, d);
        if (nowMs >= endToday) delta = 7;
      }
      return localEndOfDayUtc(y, m, d + delta);
    }
    case 'end-of-month': {
      const endThis = localEndOfDayUtc(y, m + 1, 0);
      if (nowMs < endThis) return endThis;
      return localEndOfDayUtc(y, m + 2, 0);
    }
    default:
      return nowMs;
  }
}
