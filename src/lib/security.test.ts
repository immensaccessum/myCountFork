import { describe, it, expect } from 'vitest';
// @ts-expect-error untyped server module
import { safeRedirectTarget } from '../../server/og-html.mjs';
// @ts-expect-error untyped server module
import { allowRequest } from '../../server/rate-limit.mjs';
import { parseUrlState, buildAppShareUrl, MAX_SHARE_TEXT } from './url-state';
import { Base64 } from './base64';

const ORIGIN = 'https://app4.letovrf.ru';

describe('safeRedirectTarget', () => {
  it('allows relative paths', () => {
    expect(safeRedirectTarget('/ru/?wm=4&t=1', ORIGIN)).toBe(`${ORIGIN}/ru/?wm=4&t=1`);
  });

  it('allows same-host absolute urls', () => {
    expect(safeRedirectTarget(`${ORIGIN}/en/`, ORIGIN)).toBe(`${ORIGIN}/en/`);
  });

  it('rejects foreign hosts', () => {
    expect(safeRedirectTarget('https://evil.example/phish', ORIGIN)).toBeNull();
  });

  it('rejects protocol-relative and javascript urls', () => {
    expect(safeRedirectTarget('//evil.example/x', ORIGIN)).toBeNull();
    expect(safeRedirectTarget('javascript:alert(1)', ORIGIN)).toBeNull();
  });
});

describe('allowRequest', () => {
  it('blocks after the per-minute limit', () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(allowRequest(key, 5)).toBe(true);
    expect(allowRequest(key, 5)).toBe(false);
  });
});

describe('share text limits', () => {
  it('truncates long text1 when building a url', () => {
    const long = 'а'.repeat(500);
    const url = buildAppShareUrl({
      basePath: '/ru/',
      bornTime: 1,
      getTZ: () => 0,
      format: 1,
      text1: long,
      text2: '',
    });
    const state = parseUrlState(url.slice(url.indexOf('?')));
    expect(state.t1?.length).toBe(MAX_SHARE_TEXT);
  });

  it('caps oversized t1 from foreign urls', () => {
    const huge = encodeURIComponent(Base64.encode('б'.repeat(5000)));
    const state = parseUrlState(`?wm=4&t=1&t1=${huge}`);
    expect((state.t1 || '').length).toBeLessThanOrEqual(200);
  });
});
