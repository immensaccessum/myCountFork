/** Life grid helpers: weeks / months / days. */

export type LifeGridUnit = 'weeks' | 'months' | 'days';

export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;
export const DAYS_PER_YEAR = 365;

export const LIFE_GRID_UNITS: LifeGridUnit[] = ['weeks', 'months', 'days'];

export function parseLifeGridUnit(raw: string | null | undefined): LifeGridUnit {
  if (raw === 'months' || raw === 'days' || raw === 'weeks') return raw;
  return 'weeks';
}

export function colsForUnit(unit: LifeGridUnit): number {
  if (unit === 'months') return MONTHS_PER_YEAR;
  if (unit === 'days') return DAYS_PER_YEAR;
  return WEEKS_PER_YEAR;
}

export function totalCells(unit: LifeGridUnit, years: number): number {
  return Math.max(0, Math.floor(years)) * colsForUnit(unit);
}

/** @deprecated use totalCells('weeks', years) */
export function totalWeeks(years: number): number {
  return totalCells('weeks', years);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Full weeks lived from birth midnight to now (floored, never negative). */
export function weeksLived(birth: Date, now: Date = new Date()): number {
  const b = startOfDay(birth);
  const n = startOfDay(now);
  const ms = n.getTime() - b.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (7 * 86400000));
}

export function monthsLived(birth: Date, now: Date = new Date()): number {
  const b = startOfDay(birth);
  const n = startOfDay(now);
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) months -= 1;
  return Math.max(0, months);
}

export function daysLived(birth: Date, now: Date = new Date()): number {
  const b = startOfDay(birth);
  const n = startOfDay(now);
  const ms = n.getTime() - b.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / 86400000);
}

export function cellsLived(unit: LifeGridUnit, birth: Date, now: Date = new Date()): number {
  if (unit === 'months') return monthsLived(birth, now);
  if (unit === 'days') return daysLived(birth, now);
  return weeksLived(birth, now);
}

/** Start date (local midnight) of cell index counted from birth (0 = birth cell). */
export function cellStartDate(unit: LifeGridUnit, birth: Date, index: number): Date {
  const b = startOfDay(birth);
  const i = Math.max(0, Math.floor(index));
  if (unit === 'months') {
    return new Date(b.getFullYear(), b.getMonth() + i, b.getDate());
  }
  if (unit === 'days') {
    const d = new Date(b);
    d.setDate(d.getDate() + i);
    return d;
  }
  const d = new Date(b);
  d.setDate(d.getDate() + i * 7);
  return d;
}

/** @deprecated use cellStartDate('weeks', birth, index) */
export function weekStartDate(birth: Date, index: number): Date {
  return cellStartDate('weeks', birth, index);
}

/** Hit-test; supports square or rectangular cells. Gap clicks snap to nearest cell. */
export function cellFromPoint(
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  gap: number,
  cols: number,
  rows: number,
): number | null {
  if (cellW <= 0 || cellH <= 0 || x < 0 || y < 0) return null;
  const strideX = cellW + gap;
  const strideY = cellH + gap;
  const gridW = cols * strideX - gap;
  const gridH = rows * strideY - gap;
  if (x > gridW || y > gridH) return null;
  const col = Math.min(cols - 1, Math.max(0, Math.floor(x / strideX)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(y / strideY)));
  return row * cols + col;
}

export type LifeMilestoneKind = 'birthday' | 'decade';

export interface LifeMilestone {
  index: number;
  age: number;
  kind: LifeMilestoneKind;
}

/**
 * Годовщины и круглые возраста → индекс клетки.
 * Для months — только десятилетия (иначе почти весь ряд «особый»).
 */
export function lifeMilestones(
  unit: LifeGridUnit,
  birth: Date,
  maxYears: number,
): Map<number, LifeMilestone> {
  const total = totalCells(unit, maxYears);
  const map = new Map<number, LifeMilestone>();
  const b = startOfDay(birth);
  for (let age = 1; age <= maxYears; age++) {
    const day = new Date(b.getFullYear() + age, b.getMonth(), b.getDate());
    const index = cellsLived(unit, b, day);
    if (index < 0 || index >= total) continue;
    const isDecade = age % 10 === 0;
    if (unit === 'months' && !isDecade) continue;
    const kind: LifeMilestoneKind = isDecade ? 'decade' : 'birthday';
    map.set(index, { index, age, kind });
  }
  return map;
}
