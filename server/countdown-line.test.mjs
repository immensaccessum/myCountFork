import { describe, it, expect } from 'vitest';
import { countdownLineFromCounterPath, detectLangFromPath } from './countdown-line.mjs';

describe('countdownLineFromCounterPath', () => {
  it('detects lang from path', () => {
    expect(detectLangFromPath('/en/?wm=4')).toBe('en');
    expect(detectLangFromPath('/ru/?wm=4')).toBe('ru');
  });

  it('computes days left for t param', () => {
    const future = Date.now() + 5 * 86400000;
    const line = countdownLineFromCounterPath(`/ru/?wm=4&t=${future}`, 'ru');
    expect(line).toMatch(/осталось 5 дней/);
  });

  it('computes days ago for past t', () => {
    const past = Date.now() - 3 * 86400000;
    const line = countdownLineFromCounterPath(`/ru/?wm=4&t=${past}`, 'ru');
    expect(line).toMatch(/прошло 3 дня/);
  });
});
