import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night, ReadNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

const night: Night = {
  night: '2026-10-28',
  badLines: 1,
  rows: [
    {
      job: 'backup',
      owner: null,
      runs: 2,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'timeout',
      firstAt: '2026-10-28T01:00:00+01:00',
      lastAt: '2026-10-28T01:05:00+01:00',
    },
    {
      job: 'sync',
      owner: 'ana',
      runs: 1,
      retries: 0,
      lastStatus: 'fail',
      lastError: null,
      firstAt: '2026-10-28T02:00:00+01:00',
      lastAt: '2026-10-28T02:00:00+01:00',
    },
  ],
};

describe('GET /api/digest/:night', () => {
  it('returns the reader night as-is, null owner kept', async () => {
    const fake: ReadNight = (_dir, n) => (n === '2026-10-28' ? night : null);
    const res = await createApp(config, { readNight: fake }).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(night);
  });

  it('404s when the reader finds no file', async () => {
    const res = await createApp(config, { readNight: () => null }).request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no runs for 2026-01-01' });
  });

  it('404s a malformed night without calling the reader', async () => {
    const fake: ReadNight = () => {
      throw new Error('should not be called');
    };
    const res = await createApp(config, { readNight: fake }).request('/api/digest/..%2Fetc');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });
});
