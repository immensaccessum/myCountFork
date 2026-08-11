/** Progress from start of calendar year containing the target to the target date. */
export function eventProgressPct(bornTime: number, now = Date.now()): number {
  const target = new Date(bornTime);
  const year = target.getFullYear();
  const start = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
  const end = bornTime;
  if (end <= start) return 0;
  const pct = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
