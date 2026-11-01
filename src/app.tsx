import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight as defaultReadNight } from './digest/read.js';
import type { ReadNight } from './digest/types.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig(), deps: { readNight?: ReadNight } = {}) {
  const readNight = deps.readNight ?? defaultReadNight;
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config, readNight)} />
      </Layout>,
    ),
  );

  return app;
}
