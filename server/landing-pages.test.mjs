import { describe, it, expect } from 'vitest';
import { orthodoxEaster, maslenitsaSunday, resolveDynamicRule } from './landing-pages.mjs';

describe('orthodoxEaster', () => {
  it('computes known years', () => {
    expect(orthodoxEaster(2025)).toEqual({ year: 2025, month: 4, day: 20 });
    expect(orthodoxEaster(2026)).toEqual({ year: 2026, month: 4, day: 12 });
    expect(orthodoxEaster(2027)).toEqual({ year: 2027, month: 5, day: 2 });
    expect(orthodoxEaster(2028)).toEqual({ year: 2028, month: 4, day: 16 });
  });

  it('maslenitsa is easter minus 56 days', () => {
    // 2026 Easter Apr 12 → Maslenitsa Feb 15
    expect(maslenitsaSunday(2026)).toEqual({ year: 2026, month: 2, day: 15 });
  });
});

describe('resolveDynamicRule (server, MSK)', () => {
  const now = Date.UTC(2026, 7, 12, 12, 0, 0); // Wed midday UTC
  it('next-friday in MSK', () => {
    const t = resolveDynamicRule('next-friday', now, 180);
    // Fri Aug 14 00:00 MSK = Aug 13 21:00 UTC
    expect(t).toBe(Date.UTC(2026, 7, 13, 21, 0, 0));
  });
});
