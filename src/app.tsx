import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight as defaultReadNight } from './digest/read.js';
import type { ReadNight } from './digest/types.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage, NoRuns } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

export function createApp(
  config: RigConfig = loadConfig(),
  deps: { readNight?: ReadNight } = {},
) {
  const app = new Hono();
  const readNight = deps.readNight ?? defaultReadNight;

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    // Validate before the reader sees it: blocks path traversal.
    const data = NIGHT.test(night) ? readNight(config.runsDir, night) : null;
    if (!data) {
      return c.html(
        <Layout title="digest" lane={lane()}>
          <NoRuns night={NIGHT.test(night) ? night : 'that night'} />
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest ${night}`} lane={lane()}>
        <DigestPage night={data} />
      </Layout>,
    );
  });

  return app;
}
