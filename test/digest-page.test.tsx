import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night, ReadNight } from '../src/digest/types.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

const night: Night = {
  night: '2026-10-28',
  badLines: 0,
  rows: [
    { job: 'backup', owner: null, runs: 1, retries: 0, lastStatus: 'ok', lastError: null, firstAt: '2026-10-28T01:00:00+01:00', lastAt: '2026-10-28T01:00:00+01:00' },
    { job: 'sync', owner: 'ana', runs: 2, retries: 1, lastStatus: 'fail', lastError: 'boom', firstAt: '2026-10-28T02:00:00+01:00', lastAt: '2026-10-28T02:05:00+01:00' },
  ],
};
const fake: ReadNight = (_dir, n) => (n === '2026-10-28' ? night : null);

describe('digest page', () => {
  it('renders rows, dashes for missing data, warn on fail', async () => {
    const res = await createApp(config, { readNight: fake }).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('backup');
    expect(html).toContain('<td>—</td>');
    expect(html).toContain('<tr class="warn"><td>sync</td>');
    expect(html).not.toContain('<tr class="warn"><td>backup</td>');
  });

  it('404s for a night with no file and for a bad date', async () => {
    const app = createApp(config, { readNight: fake });
    expect((await app.request('/digest/2026-10-27')).status).toBe(404);
    expect((await app.request('/digest/..%2Fsecret')).status).toBe(404);
  });
});
