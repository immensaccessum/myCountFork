import { describe, it, expect } from 'vitest';
import {
  cellFromPoint,
  cellStartDate,
  cellsLived,
  colsForUnit,
  lifeMilestones,
  monthsLived,
  parseLifeGridUnit,
  totalCells,
  totalWeeks,
  weekStartDate,
  weeksLived,
  WEEKS_PER_YEAR,
} from './life-grid';

describe('life-grid', () => {
  it('totalWeeks uses 52 weeks per year', () => {
    expect(totalWeeks(80)).toBe(80 * WEEKS_PER_YEAR);
    expect(totalWeeks(0)).toBe(0);
    expect(totalWeeks(1.9)).toBe(52);
  });

  it('totalCells and colsForUnit cover all units', () => {
    expect(colsForUnit('weeks')).toBe(52);
    expect(colsForUnit('months')).toBe(12);
    expect(colsForUnit('days')).toBe(365);
    expect(totalCells('months', 80)).toBe(960);
    expect(totalCells('days', 2)).toBe(730);
  });

  it('weeksLived counts full weeks from birth', () => {
    const birth = new Date(2000, 0, 1);
    const afterExact = new Date(2000, 0, 15); // 14 days = 2 weeks
    expect(weeksLived(birth, afterExact)).toBe(2);
    const midWeek = new Date(2000, 0, 10); // 9 days
    expect(weeksLived(birth, midWeek)).toBe(1);
  });

  it('monthsLived and daysLived count calendar spans', () => {
    const birth = new Date(2000, 0, 15);
    expect(monthsLived(birth, new Date(2000, 2, 14))).toBe(1);
    expect(monthsLived(birth, new Date(2000, 2, 15))).toBe(2);
    expect(cellsLived('days', birth, new Date(2000, 0, 20))).toBe(5);
  });

  it('weeksLived is 0 for dates before birth', () => {
    const birth = new Date(2000, 0, 1);
    expect(weeksLived(birth, new Date(1999, 11, 31))).toBe(0);
  });

  it('weekStartDate / cellStartDate offset correctly', () => {
    const birth = new Date(1990, 5, 15);
    expect(weekStartDate(birth, 0).getTime()).toBe(new Date(1990, 5, 15).getTime());
    expect(weekStartDate(birth, 1).getTime()).toBe(new Date(1990, 5, 22).getTime());
    expect(cellStartDate('months', birth, 1).getTime()).toBe(new Date(1990, 6, 15).getTime());
    expect(cellStartDate('days', birth, 3).getTime()).toBe(new Date(1990, 5, 18).getTime());
  });

  it('cellFromPoint maps canvas coords to week index', () => {
    expect(cellFromPoint(0, 0, 10, 10, 1, 52, 80)).toBe(0);
    expect(cellFromPoint(10.5, 0, 10, 10, 1, 52, 80)).toBe(0); // gap snaps to left cell
    expect(cellFromPoint(11, 0, 10, 10, 1, 52, 80)).toBe(1);
    expect(cellFromPoint(0, 11, 10, 10, 1, 52, 80)).toBe(52);
    expect(cellFromPoint(-1, 0, 10, 10, 1, 52, 80)).toBeNull();
  });

  it('cellFromPoint supports rectangular cells', () => {
    expect(cellFromPoint(25, 0, 20, 5, 0, 52, 80)).toBe(1);
    expect(cellFromPoint(0, 6, 20, 5, 0, 52, 80)).toBe(52);
  });

  it('lifeMilestones marks birthdays and decades by unit', () => {
    const birth = new Date(2000, 0, 1);
    const weeks = lifeMilestones('weeks', birth, 30);
    expect(weeks.get(cellsLived('weeks', birth, new Date(2001, 0, 1)))?.kind).toBe('birthday');
    expect(weeks.get(cellsLived('weeks', birth, new Date(2010, 0, 1)))?.kind).toBe('decade');

    const months = lifeMilestones('months', birth, 30);
    expect(months.get(cellsLived('months', birth, new Date(2001, 0, 1)))).toBeUndefined();
    expect(months.get(cellsLived('months', birth, new Date(2010, 0, 1)))?.kind).toBe('decade');
  });

  it('parseLifeGridUnit falls back to weeks', () => {
    expect(parseLifeGridUnit('days')).toBe('days');
    expect(parseLifeGridUnit('nope')).toBe('weeks');
  });
});
