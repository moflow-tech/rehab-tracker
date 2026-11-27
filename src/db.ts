import Dexie, { type EntityTable } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_SETTINGS } from './data/plan';
import type { DailyLog, Run, Settings, WeeklyTest, Workout } from './types';

class RehabDB extends Dexie {
  workouts!: EntityTable<Workout, 'id'>;
  daily!: EntityTable<DailyLog, 'date'>;
  tests!: EntityTable<WeeklyTest, 'date'>;
  runs!: EntityTable<Run, 'id'>;
  kv!: EntityTable<{ key: string; value: unknown }, 'key'>;

  constructor() {
    super('rehab-tracker');
    this.version(1).stores({
      workouts: '++id, date, session',
      daily: 'date',
      tests: 'date',
      runs: '++id, date',
      kv: 'key',
    });
  }
}

export const db = new RehabDB();

// Ask the browser not to evict our data under storage pressure.
navigator.storage?.persist?.().catch(() => {});

export interface AllData {
  workouts: Workout[];
  daily: DailyLog[];
  tests: WeeklyTest[];
  runs: Run[];
  settings: Settings;
}

function mergeSettings(s?: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    steps: { ...DEFAULT_SETTINGS.steps, ...s?.steps },
    ladders: { ...DEFAULT_SETTINGS.ladders, ...s?.ladders },
  };
}

export async function loadAll(): Promise<AllData> {
  const [workouts, daily, tests, runs, s] = await Promise.all([
    db.workouts.orderBy('date').toArray(),
    db.daily.orderBy('date').toArray(),
    db.tests.orderBy('date').toArray(),
    db.runs.orderBy('date').toArray(),
    db.kv.get('settings'),
  ]);
  return { workouts, daily, tests, runs, settings: mergeSettings(s?.value as Partial<Settings>) };
}

/** Everything, live. Undefined while loading. The data set is small, so one query keeps things simple. */
export function useData(): AllData | undefined {
  return useLiveQuery(loadAll, []);
}

export async function saveSettings(s: Settings) {
  await db.kv.put({ key: 'settings', value: s });
}

/** Read-modify-write settings in one transaction, so quick taps never overwrite each other. */
export async function patchSettings(fn: (s: Settings) => Settings) {
  await db.transaction('rw', db.kv, async () => {
    const cur = mergeSettings((await db.kv.get('settings'))?.value as Partial<Settings>);
    await db.kv.put({ key: 'settings', value: fn(cur) });
  });
}

export async function saveDaily(log: DailyLog) {
  await db.daily.put(log);
}

/** Read-modify-write in one transaction, so quick taps never overwrite each other. */
export async function patchDaily(date: string, fn: (log: DailyLog) => DailyLog) {
  await db.transaction('rw', db.daily, async () => {
    const cur = (await db.daily.get(date)) ?? { date, items: {} };
    await db.daily.put(fn(cur));
  });
}

export async function getDaily(date: string): Promise<DailyLog> {
  return (await db.daily.get(date)) ?? { date, items: {} };
}

export async function exportJSON(): Promise<string> {
  const data = await loadAll();
  return JSON.stringify({ app: 'rehab-tracker', version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export async function importJSON(text: string) {
  const d = JSON.parse(text) as Partial<AllData> & { app?: string };
  if (d.app !== 'rehab-tracker') throw new Error('This file is not a Rehab Tracker backup.');
  await db.transaction('rw', [db.workouts, db.daily, db.tests, db.runs, db.kv], async () => {
    await Promise.all([db.workouts.clear(), db.daily.clear(), db.tests.clear(), db.runs.clear()]);
    await db.workouts.bulkAdd(d.workouts ?? []);
    await db.daily.bulkPut(d.daily ?? []);
    await db.tests.bulkPut(d.tests ?? []);
    await db.runs.bulkAdd(d.runs ?? []);
    if (d.settings) await db.kv.put({ key: 'settings', value: d.settings });
  });
}

/** Merge imported workouts: entries for an exercise already logged that day/session are skipped. */
export async function mergeWorkouts(incoming: Workout[]): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  await db.transaction('rw', db.workouts, async () => {
    for (const w of incoming) {
      const existing = await db.workouts.where({ date: w.date, session: w.session }).first();
      if (!existing) {
        await db.workouts.add(w);
        added += w.entries.length;
        continue;
      }
      const have = new Set(existing.entries.map((e) => e.exerciseId));
      const fresh = w.entries.filter((e) => !have.has(e.exerciseId));
      skipped += w.entries.length - fresh.length;
      added += fresh.length;
      await db.workouts.put({ ...existing, entries: [...existing.entries, ...fresh] });
    }
  });
  return { added, skipped };
}

export async function eraseAll() {
  await Promise.all([db.workouts.clear(), db.daily.clear(), db.tests.clear(), db.runs.clear(), db.kv.clear()]);
}

export function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
