import { describe, it, expect } from 'vitest';
import { eventProgressPct } from './progress';

describe('eventProgressPct', () => {
  it('returns 0 at start of year when event is later same year', () => {
    const end = new Date(2026, 7, 1).getTime(); // Aug 1 2026
    const now = new Date(2026, 0, 1).getTime(); // Jan 1 2026
    expect(eventProgressPct(end, now)).toBe(0);
  });

  it('returns ~50% halfway through year to mid-year event', () => {
    const end = new Date(2026, 7, 1).getTime();
    const now = new Date(2026, 3, 15).getTime(); // ~Apr 15
    const pct = eventProgressPct(end, now);
    expect(pct).toBeGreaterThan(30);
    expect(pct).toBeLessThan(55);
  });

  it('does not stick at 0% when event is in the next calendar year', () => {
    const end = new Date(2027, 7, 1).getTime();
    const now = new Date(2026, 7, 11).getTime(); // Aug 11 2026
    expect(eventProgressPct(end, now)).toBeGreaterThan(0);
  });

  it('returns 100 when event has passed', () => {
    const end = new Date(2026, 0, 15).getTime();
    const now = new Date(2026, 1, 1).getTime();
    expect(eventProgressPct(end, now)).toBe(100);
  });
});
