/**
 * Share of time elapsed from 1 January of the current year to the target date.
 * (Not from 1 Jan of the event year — that yields 0% when the event is next year.)
 */
export function eventProgressPct(bornTime: number, now = Date.now()): number {
  const end = bornTime;
  if (end <= now) return 100;

  const startYear = new Date(now).getFullYear();
  const start = new Date(startYear, 0, 1, 0, 0, 0, 0).getTime();
  if (end <= start) return 0;

  const pct = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
