import { describe, it, expect } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
// @ts-expect-error untyped server module
import { createStore } from '../../server/short-links.mjs';

function tmpStorePath(): string {
  return join(tmpdir(), `short-links-test-${randomBytes(6).toString('hex')}.json`);
}

describe('short link store', () => {
  it('creates id and resolves it back', () => {
    const store = createStore(tmpStorePath());
    const id = store.create({ to: '/ru/?wm=4&t=1', title: 'Title', desc: 'Desc' });
    expect(id).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(store.get(id)).toMatchObject({ to: '/ru/?wm=4&t=1', title: 'Title' });
  });

  it('dedupes identical payloads', () => {
    const store = createStore(tmpStorePath());
    const a = store.create({ to: '/ru/?t=1', title: 'A', desc: 'A' });
    const b = store.create({ to: '/ru/?t=1', title: 'A', desc: 'A' });
    const c = store.create({ to: '/ru/?t=2', title: 'A', desc: 'A' });
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('persists across store instances', () => {
    const path = tmpStorePath();
    const id = createStore(path).create({ to: '/en/?t=5', title: 'X', desc: 'X' });
    expect(createStore(path).get(id)?.to).toBe('/en/?t=5');
  });
});
