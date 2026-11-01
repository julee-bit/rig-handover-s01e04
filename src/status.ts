import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import type { Night, ReadNight } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightCounts = { ok: number; retry: number; fail: number };
export type NightSummary = { night: string; counts: NightCounts | null };

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightSummary[];
};

// Counts are jobs by lastStatus (one per row), not run lines.
// null (no file) renders as dashes.
export function nightCounts(night: Night | null): NightCounts | null {
  if (!night) return null;
  const counts = { ok: 0, retry: 0, fail: 0 };
  for (const row of night.rows) counts[row.lastStatus] += 1;
  return counts;
}

function summarize(runsDir: string, night: string, read: ReadNight): NightSummary {
  try {
    return { night, counts: nightCounts(read(runsDir, night)) };
  } catch {
    return { night, counts: null };
  }
}

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig, read: ReadNight): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((n) => summarize(config.runsDir, n, read)),
  };
}
