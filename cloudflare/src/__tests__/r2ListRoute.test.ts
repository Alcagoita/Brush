import { describe, expect, it, vi } from 'vitest';

vi.mock('@cloudflare/containers', () => ({
  getContainer: () => ({ start: vi.fn() }),
  Container: class {},
}));

import worker, { type Env } from '../index';

const CTX = { waitUntil(_promise: Promise<unknown>) {}, passThroughOnException() {} } as unknown as ExecutionContext;

function listing(overrides: Partial<R2Objects> = {}): R2Objects {
  return {
    objects: [],
    delimitedPrefixes: [],
    truncated: false,
    ...overrides,
  } as unknown as R2Objects;
}

function envWith(result: R2Objects) {
  const list = vi.fn().mockResolvedValue(result);
  const env = { BUILD_TRIGGER_SECRET: 'secret', POI_EXPORTS: { list } } as unknown as Env;
  return { env, list };
}

const get = (query: string, secret: string | null = 'secret') => new Request(
  `https://poi-api.test/internal/r2/list${query}`,
  { headers: secret === null ? {} : { 'X-Build-Secret': secret } },
);

describe('KAN-444 /internal/r2/list', () => {
  it('lists an allowlisted prefix and returns only discovery metadata', async () => {
    const uploaded = new Date('2026-08-20T10:00:00Z');
    const { env, list } = envWith(listing({
      objects: [{ key: 'country-sources-unfiltered/PT/a.csv', size: 12, uploaded, etag: 'e1', body: 'never' }] as never,
      truncated: true,
      cursor: 'next-page',
    } as never));
    const response = await worker.fetch(get('?prefix=country-sources-unfiltered/PT/&limit=50'), env, CTX);
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith({ prefix: 'country-sources-unfiltered/PT/', cursor: undefined, delimiter: undefined, limit: 50 });
    expect(await response.json()).toEqual({
      objects: [{ key: 'country-sources-unfiltered/PT/a.csv', size: 12, uploaded: '2026-08-20T10:00:00.000Z', etag: 'e1' }],
      delimitedPrefixes: [],
      truncated: true,
      cursor: 'next-page',
    });
  });

  it('passes the cursor through and reports no cursor on the last page', async () => {
    const { env, list } = envWith(listing());
    const response = await worker.fetch(get('?prefix=archives/&cursor=abc'), env, CTX);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ prefix: 'archives/', cursor: 'abc', limit: 1000 }));
    expect(await response.json()).toMatchObject({ truncated: false, cursor: null });
  });

  it('lists the root only as namespaces, with the path delimiter', async () => {
    const { env, list } = envWith(listing({ delimitedPrefixes: ['archives/', 'exports/'] }));
    const response = await worker.fetch(get('?delimiter=/'), env, CTX);
    expect(response.status).toBe(200);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ prefix: '', delimiter: '/' }));
    expect(await response.json()).toMatchObject({ delimitedPrefixes: ['archives/', 'exports/'] });
  });

  it('refuses a root listing without a delimiter, or with any other delimiter', async () => {
    const { env, list } = envWith(listing());
    expect((await worker.fetch(get(''), env, CTX)).status).toBe(400);
    expect((await worker.fetch(get('?delimiter=-'), env, CTX)).status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });

  it('refuses a prefix outside the discovery allowlist', async () => {
    const { env, list } = envWith(listing());
    const response = await worker.fetch(get('?prefix=exports/'), env, CTX);
    expect(response.status).toBe(403);
    expect(list).not.toHaveBeenCalled();
  });

  it('refuses a limit outside 1..1000', async () => {
    const { env, list } = envWith(listing());
    for (const limit of ['0', '1001', 'ten', '2.5']) {
      expect((await worker.fetch(get(`?prefix=archives/&limit=${limit}`), env, CTX)).status).toBe(400);
    }
    expect(list).not.toHaveBeenCalled();
  });

  it('is never reachable without the internal secret', async () => {
    const { env, list } = envWith(listing());
    expect((await worker.fetch(get('?prefix=archives/', null), env, CTX)).status).toBe(401);
    expect((await worker.fetch(get('?prefix=archives/', 'wrong'), env, CTX)).status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });
});
