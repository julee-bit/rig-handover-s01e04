import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

// Real reader, temp runs dir. Never touches runs/.
let runsDir: string;
let app: ReturnType<typeof createApp>;

const line = (o: Record<string, unknown>) => JSON.stringify(o);
const SYNC = line({ at: '2026-10-20T02:00:00+01:00', job: 'sync', status: 'ok', owner: 'ana' });
const BACKUP = line({ at: '2026-10-20T01:00:00+01:00', job: 'backup', status: 'ok' });

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  // sync is written before backup so sorting by job is observable.
  writeFileSync(join(runsDir, '2026-10-20.jsonl'), [SYNC, BACKUP].join('\n') + '\n');
  writeFileSync(join(runsDir, '2026-10-21.jsonl'), '');
  writeFileSync(join(runsDir, '2026-10-22.jsonl'), [SYNC, 'not json {', BACKUP].join('\n') + '\n');
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

const json = async (night: string) => {
  const res = await app.request(`/api/digest/${night}`);
  return { res, body: (await res.json()) as Night };
};
const html = async (night: string) => {
  const res = await app.request(`/digest/${night}`);
  return { res, text: await res.text() };
};
const jobsInHtml = (text: string) =>
  [...text.matchAll(/<tr[^>]*><td>([^<]*)<\/td>/g)].map((m) => m[1]);

describe('digest page route (real reader)', () => {
  it('200 with rows sorted by job and a dash for a null owner', async () => {
    const { res, text } = await html('2026-10-20');
    expect(res.status).toBe(200);
    expect(jobsInHtml(text)).toEqual(['backup', 'sync']);
    expect(text).toContain('<td>backup</td><td>—</td>');
    expect(text).toContain('<td>sync</td><td>ana</td>');
  });

  it('404 for a night with no file', async () => {
    expect((await html('2026-10-19')).res.status).toBe(404);
  });

  it('200 "nothing ran" for an empty night', async () => {
    const { res, text } = await html('2026-10-21');
    expect(res.status).toBe(200);
    expect(text).toContain('nothing ran');
  });

  it('reports a bad line and still shows the good rows', async () => {
    const { res, text } = await html('2026-10-22');
    expect(res.status).toBe(200);
    expect(text).toContain('1 line(s) did not parse');
    expect(jobsInHtml(text)).toEqual(['backup', 'sync']);
  });
});

describe('digest JSON route (real reader)', () => {
  it('200 with rows in job order and owner null', async () => {
    const { res, body } = await json('2026-10-20');
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-10-20');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => [r.job, r.owner])).toEqual([
      ['backup', null],
      ['sync', 'ana'],
    ]);
  });

  it('404 for a night with no file', async () => {
    expect((await json('2026-10-19')).res.status).toBe(404);
  });

  it('200 with no rows for an empty night', async () => {
    const { res, body } = await json('2026-10-21');
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts a bad line and keeps the good rows', async () => {
    const { res, body } = await json('2026-10-22');
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['backup', 'sync']);
  });
});

describe('page and JSON agree', () => {
  it.each(['2026-10-20', '2026-10-22'])('same jobs, same order for %s', async (night) => {
    const { text } = await html(night);
    const { body } = await json(night);
    expect(jobsInHtml(text)).toEqual(body.rows.map((r) => r.job));
  });
});
