import { describe, it, expect } from 'vitest';
import { resolveDynamicRule } from './dynamic-date';

describe('resolveDynamicRule', () => {
  // Fixed "now": Wednesday 2026-08-12 15:00 UTC+11 (= 2026-08-12 04:00 UTC)
  const now = Date.UTC(2026, 7, 12, 4, 0, 0);
  const tz = 11 * 60; // +11

  it('next-friday is local midnight of Aug 14', () => {
    const t = resolveDynamicRule('next-friday', now, tz);
    // Aug 14 00:00 +11 = Aug 13 13:00 UTC
    expect(t).toBe(Date.UTC(2026, 7, 13, 13, 0, 0));
  });

  it('next-saturday is local midnight of Aug 15', () => {
    const t = resolveDynamicRule('next-saturday', now, tz);
    expect(t).toBe(Date.UTC(2026, 7, 14, 13, 0, 0));
  });

  it('next-monday is local midnight of Aug 17', () => {
    const t = resolveDynamicRule('next-monday', now, tz);
    expect(t).toBe(Date.UTC(2026, 7, 16, 13, 0, 0));
  });

  it('end-of-day is local 23:59:59 today', () => {
    const t = resolveDynamicRule('end-of-day', now, tz);
    expect(t).toBe(Date.UTC(2026, 7, 12, 12, 59, 59));
  });

  it('end-of-week is Sunday 23:59:59 local', () => {
    const t = resolveDynamicRule('end-of-week', now, tz);
    // Sunday Aug 16 23:59:59 +11 = Aug 16 12:59:59 UTC
    expect(t).toBe(Date.UTC(2026, 7, 16, 12, 59, 59));
  });

  it('end-of-month is Aug 31 23:59:59 local', () => {
    const t = resolveDynamicRule('end-of-month', now, tz);
    expect(t).toBe(Date.UTC(2026, 7, 31, 12, 59, 59));
  });
});
