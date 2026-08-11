import { describe, it, expect } from 'vitest';
import { defaultEventIndex } from './types';

describe('defaultEventIndex', () => {
  it('picks event closest to now', () => {
    const now = Date.now();
    const events = [
      { id: 'a', t: now - 1e12, name: { ru: '', en: '' }, desc: { ru: '', en: '' }, source: 'history' as const, tz: 0 },
      { id: 'b', t: now + 86400000, name: { ru: '', en: '' }, desc: { ru: '', en: '' }, source: 'annual' as const, tz: 0 },
      { id: 'c', t: now + 1e12, name: { ru: '', en: '' }, desc: { ru: '', en: '' }, source: 'annual' as const, tz: 0 },
    ];
    expect(defaultEventIndex(events)).toBe(2);
  });
});
