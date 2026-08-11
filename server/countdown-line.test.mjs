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

  it('prefers t= over stale lt= params', () => {
    const future = Date.now() + 10 * 86400000;
    const line = countdownLineFromCounterPath(
      `/ru/?wm=4&t=${future}&lt=1&ly=2012&lm=3&ld=19&lh=8&la=1`,
      'ru',
    );
    expect(line).toMatch(/осталось 10 дней/);
  });
});
