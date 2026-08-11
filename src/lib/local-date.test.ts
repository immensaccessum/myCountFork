import { describe, it, expect } from 'vitest';
import { resolveLocalBornTime, wallClockToUtc } from './local-date';

describe('resolveLocalBornTime', () => {
  it('uses recipient offset for annual date', () => {
    const spec = { year: 2026, month: 10, day: 8, hour: 0, min: 0, sec: 0, annual: true };
    const msk = 180;
    const syd = 660;
    const now = wallClockToUtc(2026, 10, 1, 12, 0, 0, msk);
    const tMsk = resolveLocalBornTime(spec, msk, now);
    const tSyd = resolveLocalBornTime(spec, syd, now);
    expect(tMsk).not.toBe(tSyd);
    expect(tMsk - tSyd).toBe((syd - msk) * 60 * 1000);
  });

  it('keeps fixed year for non-annual', () => {
    const spec = { year: 2026, month: 10, day: 8, hour: 0, min: 0, sec: 0, annual: false };
    const t = resolveLocalBornTime(spec, 180, Date.UTC(2026, 0, 1));
    expect(t).toBe(wallClockToUtc(2026, 10, 8, 0, 0, 0, 180));
  });
});
