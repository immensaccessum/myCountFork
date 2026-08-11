import { describe, it, expect } from 'vitest';
import { buildShareUrl, buildAppShareUrl, parseUrlState, buildOgShareUrl, parseOgQuery } from './url-state';
import { Base64 } from './base64';

describe('parseUrlState', () => {
  it('parses share link params', () => {
    const t1 = Base64.encode('Hello');
    const state = parseUrlState(`?wm=4&t=1332104400000&tz=65537&fid=2&t1=${encodeURIComponent(t1)}`);
    expect(state.wm).toBe(4);
    expect(state.t).toBe(1332104400000);
    expect(state.tz).toBe(65537);
    expect(state.fid).toBe(2);
    expect(state.t1).toBe('Hello');
  });

  it('parses eid and cc', () => {
    const state = parseUrlState('?wm=1&eid=preset%3Asputnik&cc=ru');
    expect(state.eid).toBe('preset:sputnik');
    expect(state.cc).toBe('RU');
  });

  it('defaults to wm=3', () => {
    expect(parseUrlState('').wm).toBe(3);
  });

  it('parses local wall-clock share link (lt=1)', () => {
    const state = parseUrlState('?wm=4&lt=1&la=1&ly=2026&lm=10&ld=8&lh=0&ln=0&ls=0');
    expect(state.lt).toBe(true);
    expect(state.local).toEqual({
      year: 2026,
      month: 10,
      day: 8,
      hour: 0,
      min: 0,
      sec: 0,
      annual: true,
    });
    expect(state.t).toBeUndefined();
  });

  it('parses event alias for eid', () => {
    const state = parseUrlState('?event=landing:month:8');
    expect(state.eid).toBe('landing:month:8');
  });

  it('parses th theme param', () => {
    expect(parseUrlState('?th=cosmo').th).toBe('cosmo');
  });
});

describe('buildShareUrl', () => {
  it('builds wm=4 url', () => {
    const url = buildShareUrl('/ru/', 1000, () => 65537, 1, 'top', '');
    expect(url).toContain('wm=4');
    expect(url).toContain('t=1000');
    expect(url).toContain('tz=65537');
    expect(url).toContain('fid=1');
  });
});

describe('buildAppShareUrl', () => {
  it('includes eid and cc when set', () => {
    const url = buildAppShareUrl({
      basePath: '/ru/',
      bornTime: 1000,
      getTZ: () => 0,
      format: 1,
      text1: 'a',
      text2: '',
      eid: 'preset:moon',
      cc: 'US',
    });
    expect(url).toContain('eid=preset%3Amoon');
    expect(url).toContain('cc=US');
  });

  it('omits tz when omitTz is set', () => {
    const url = buildAppShareUrl({
      basePath: '/ru/',
      bornTime: 1000,
      getTZ: () => 65537,
      format: 1,
      text1: '',
      text2: '',
      omitTz: true,
    });
    expect(url).not.toContain('tz=');
  });

  it('encodes t1 once and round-trips cyrillic text', () => {
    const text = 'от 19 марта 2012 г.';
    const url = buildAppShareUrl({
      basePath: '/ru/',
      bornTime: 1332104400000,
      getTZ: () => 0,
      format: 1,
      text1: text,
      text2: '',
    });
    expect(url).not.toContain('%252');
    const state = parseUrlState(url.slice(url.indexOf('?')));
    expect(state.t1).toBe(text);
  });

  it('builds local share url with lt params', () => {
    const url = buildAppShareUrl({
      basePath: '/ru/',
      bornTime: 1000,
      getTZ: () => 65537,
      format: 1,
      text1: '',
      text2: '',
      shareMode: 'local',
      local: { year: 2026, month: 10, day: 8, hour: 0, min: 0, sec: 0, annual: true },
    });
    expect(url).toContain('lt=1');
    expect(url).toContain('la=1');
    expect(url).toContain('lm=10');
    expect(url).not.toMatch(/[?&]t=/);
  });
});

describe('buildOgShareUrl', () => {
  it('builds og path with title and desc', () => {
    const url = buildOgShareUrl('ru', 'https://x/ru/?wm=4', 'Title', 'Desc');
    expect(url).toContain('/og/ru/');
    expect(url).toContain('title=Title');
    expect(url).toContain('desc=Desc');
    expect(url).toContain('to=');
  });
});

describe('parseOgQuery', () => {
  it('parses og query', () => {
    const q = parseOgQuery('?to=https%3A%2F%2Fx&title=Hello&desc=World');
    expect(q?.to).toBe('https://x');
    expect(q?.title).toBe('Hello');
    expect(q?.desc).toBe('World');
  });
});