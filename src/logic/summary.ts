import { TESTS, exerciseName, type TestDef } from '../data/plan';
import type { DailyLog, WeeklyTest, Workout } from '../types';
import { addDays, daysBetween } from './dates';
import { dayPlan, slotsDone } from './plan';

const better = (def: TestDef, a: number, b: number) =>
  def.better === 'lower' ? a < b : def.better === 'higher' ? a > b : false;

export interface TargetRow {
  def: TestDef;
  current?: number;
  met: boolean;
  gapText: string;
}

export function targetMet(def: TestDef, t: WeeklyTest): boolean {
  const v = t[def.key];
  if (v === undefined) return false;
  if (def.key === 'ktwR') return v >= 12 && t.ktwL !== undefined && t.ktwL - v <= 2;
  if (def.key === 'ktwL') return true;
  if (def.target === undefined) return false;
  return def.better === 'lower' ? v <= def.target : v >= def.target;
}

export function targetRows(latest: WeeklyTest): TargetRow[] {
  return TESTS.map((def) => {
    const v = latest[def.key];
    const met = targetMet(def, latest);
    let gapText = 'not tested';
    if (v !== undefined) {
      if (met) gapText = 'target met';
      else if (def.key === 'ktwR') {
        const parts = [];
        if (v < 12) parts.push(`${12 - v} cm to 12`);
        if (latest.ktwL !== undefined && latest.ktwL - v > 2) parts.push(`${latest.ktwL - v} cm behind L`);
        gapText = parts.join(', ');
      } else if (def.target !== undefined) {
        const unit = def.unit === '/10' ? 'pt' : def.unit.replace(' of 10', '');
        gapText = `${Math.abs(def.target - v)} ${unit} to go`;
      }
      else gapText = '';
    }
    return { def, current: v, met, gapText };
  });
}

export interface WeeklySummary {
  date: string;
  improved: string[];
  stalled: string[];
  targets: TargetRow[];
}

/** Value of a test about 3 weeks before `date` (the latest test at least 21 days earlier). */
function threeWeeksAgo(tests: WeeklyTest[], date: string, key: TestDef['key']): number | undefined {
  const old = tests.filter((t) => daysBetween(t.date, date) >= 21 && t[key] !== undefined);
  return old.length ? old[old.length - 1][key] : undefined;
}

export function weeklySummary(testsIn: WeeklyTest[], workouts: Workout[]): WeeklySummary | null {
  const tests = [...testsIn].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = tests[tests.length - 1];
  if (!latest) return null;
  const prev = tests[tests.length - 2];
  const improved: string[] = [];
  const stalled: string[] = [];

  for (const def of TESTS) {
    const v = latest[def.key];
    if (v === undefined || def.better === 'keep') continue;
    const p = prev?.[def.key] ?? (tests.length === 1 ? def.baseline : undefined);
    if (p !== undefined && better(def, v, p)) improved.push(`${def.label}: ${p} → ${v} ${def.unit}`);
    const old = threeWeeksAgo(tests, latest.date, def.key);
    if (old !== undefined && !better(def, v, old) && !targetMet(def, latest)) stalled.push(`${def.label} (${v} ${def.unit} for 3+ weeks)`);
  }

  // Lifts: compare latest top load / e1RM with 3+ weeks earlier
  const byEx = new Map<string, { date: string; score: number; name?: string }[]>();
  for (const w of workouts) {
    for (const e of w.entries) {
      // Trend score: Epley on the best set without the 12-rep cap, so rep gains at the same load count too.
      const score = Math.max(0, ...e.sets.map((s) => (s.loadKg ? s.loadKg * (1 + (s.reps ?? 0) / 30) : 0)));
      if (!score) continue;
      if (!byEx.has(e.exerciseId)) byEx.set(e.exerciseId, []);
      byEx.get(e.exerciseId)!.push({ date: w.date, score, name: e.name });
    }
  }
  for (const [id, rows] of byEx) {
    rows.sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = rows[rows.length - 1];
    if (daysBetween(last.date, latest.date) > 14) continue; // not done recently
    const old = rows.filter((r) => daysBetween(r.date, last.date) >= 21);
    if (old.length && last.score <= Math.max(...old.map((r) => r.score))) {
      stalled.push(`${exerciseName(id, last.name)} (no load gain in 3+ weeks)`);
    }
  }

  return { date: latest.date, improved, stalled, targets: targetRows(latest) };
}

// ---------- Headline numbers ----------

/** Share of due routines (morning + evening) done in the 7 days ending `today`. */
export function completion7(today: string, daily: DailyLog[]): number {
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, -i);
    const plan = dayPlan(date);
    const log = daily.find((d) => d.date === date);
    if (slotsDone(plan.morning, log)) done++;
    if (slotsDone(plan.evening, log)) done++;
  }
  return done / 14;
}

/** Consecutive days with both routines done, ending today (or yesterday if today isn't finished yet). */
export function streak(today: string, daily: DailyLog[]): number {
  const full = (date: string) => {
    const plan = dayPlan(date);
    const log = daily.find((d) => d.date === date);
    return slotsDone(plan.morning, log) && slotsDone(plan.evening, log);
  };
  let date = full(today) ? today : addDays(today, -1);
  let n = 0;
  while (full(date)) {
    n++;
    date = addDays(date, -1);
  }
  return n;
}
