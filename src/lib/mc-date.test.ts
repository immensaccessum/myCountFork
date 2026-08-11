import { describe, it, expect } from 'vitest';
import { McDate } from './mc-date';

describe('McDate', () => {
  it('round-trips Unix epoch', () => {
    const d = new McDate();
    d.setTime(0);
    expect(d.y).toBe(1970);
    expect(d.m).toBe(0);
    expect(d.d).toBe(0);
    expect(d.getTime()).toBe(0);
  });

  it('matches known timestamp', () => {
    const d = new McDate();
    d.setTime(1332104400000);
    expect(d.y).toBe(2012);
    expect(d.m).toBe(2);
    expect(d.d + 1).toBe(18);
  });

  it('getTime/setTime are inverse', () => {
    const d = new McDate();
    const t = Date.UTC(2020, 5, 15, 12, 30, 45);
    d.setTime(t);
    expect(Math.abs(d.getTime() - t)).toBeLessThan(2);
  });
});
