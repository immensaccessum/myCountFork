import { describe, it, expect } from 'vitest';
import {
  browserTzOffsetMin,
  formatUtcOffset,
  gmtToSeconds,
  inferTzMode,
  secondsToGmt,
} from './tz';

describe('tz', () => {
  it('formats UTC offset', () => {
    expect(formatUtcOffset(0)).toBe('(UTC)');
    expect(formatUtcOffset(180)).toBe('(UTC +3:00)');
    expect(formatUtcOffset(-300)).toBe('(UTC -5:00)');
  });

  it('round-trips GMT seconds', () => {
    const sec = gmtToSeconds(3, 30, 0);
    expect(secondsToGmt(sec)).toEqual({ h: 3, min: 30, s: 0 });
  });

  it('infers tz mode', () => {
    expect(inferTzMode(0, 0, 0)).toBe(3);
    expect(inferTzMode(1, 0, 1)).toBe(4);
    expect(inferTzMode(1, 1, 0)).toBe(2);
    expect(inferTzMode(1, 0, 0)).toBe(1);
  });

  it('browser offset is finite', () => {
    expect(Number.isFinite(browserTzOffsetMin())).toBe(true);
  });
});
