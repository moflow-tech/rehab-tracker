import type { DailyLog, Run, WeeklyTest, Workout } from '../types';
import { addDays } from './dates';

export type PainZone = 'safe' | 'settle' | 'backoff';

/** 0–2 safe · 3–5 OK if settled by next morning · >5 back off */
export function painZone(p: number): PainZone {
  if (p <= 2) return 'safe';
  if (p <= 5) return 'settle';
  return 'backoff';
}

export interface BackoffStatus {
  active: boolean;
  triggerDate?: string;
  until?: string;
  reason?: string;
}

export const BACKOFF_DAYS = 3; // trigger day + 2 more

interface Trigger {
  date: string;
  reason: string;
}

/** Highest pain logged on a day from any source (daily walking pain, workout entries, runs). */
export function maxPainOn(date: string, daily: DailyLog[], workouts: Workout[], runs: Run[]): number | undefined {
  const vals: number[] = [];
  const d = daily.find((x) => x.date === date);
  if (d?.walkingPain !== undefined) vals.push(d.walkingPain);
  for (const w of workouts) if (w.date === date) for (const e of w.entries) if (e.pain !== undefined) vals.push(e.pain);
  for (const r of runs) if (r.date === date && r.painDuring !== undefined) vals.push(r.painDuring);
  return vals.length ? Math.max(...vals) : undefined;
}

export function painTriggers(daily: DailyLog[], workouts: Workout[], tests: WeeklyTest[], runs: Run[]): Trigger[] {
  const out: Trigger[] = [];
  const dates = new Set<string>([...daily.map((d) => d.date), ...workouts.map((w) => w.date), ...runs.map((r) => r.date)]);

  for (const date of dates) {
    const max = maxPainOn(date, daily, workouts, runs);
    const morning = daily.find((d) => d.date === date)?.morningPain;
    if (max !== undefined && max > 5) out.push({ date, reason: `Pain ${max}/10 logged` });
    if (morning !== undefined && morning > 5) out.push({ date, reason: `Morning pain ${morning}/10` });

    // "3–5 is OK if it has settled by the next morning"
    const prevDay = addDays(date, -1);
    const prevMax = maxPainOn(prevDay, daily, workouts, runs);
    const prevMorning = daily.find((d) => d.date === prevDay)?.morningPain;
    if (morning !== undefined && prevMax !== undefined && prevMax >= 3 && morning > 2) {
      out.push({ date, reason: `Yesterday's pain (${prevMax}/10) hadn't settled by this morning (${morning}/10)` });
    } else if (morning !== undefined && prevMorning !== undefined && morning > prevMorning && morning >= 3) {
      out.push({ date, reason: `Morning pain went up: ${prevMorning} → ${morning}/10` });
    }
  }

  // week-to-week walking pain
  const t = [...tests].filter((x) => x.walkingPain !== undefined).sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let i = 1; i < t.length; i++) {
    if (t[i].walkingPain! > t[i - 1].walkingPain!) {
      out.push({ date: t[i].date, reason: `Weekly walking pain went up: ${t[i - 1].walkingPain} → ${t[i].walkingPain}/10` });
    }
  }
  return out;
}

export function backoffStatus(
  today: string,
  daily: DailyLog[],
  workouts: Workout[],
  tests: WeeklyTest[],
  runs: Run[],
): BackoffStatus {
  const triggers = painTriggers(daily, workouts, tests, runs).filter((t) => t.date <= today);
  if (!triggers.length) return { active: false };
  const latest = triggers.reduce((a, b) => (b.date > a.date ? b : a));
  const until = addDays(latest.date, BACKOFF_DAYS - 1);
  if (today > until) return { active: false };
  return { active: true, triggerDate: latest.date, until, reason: latest.reason };
}

export type RunFlag = 'OK' | 'Back off' | 'Pending';

export function runFlag(r: Run): RunFlag {
  if (r.painDuring !== undefined && r.painDuring > 5) return 'Back off';
  if (r.painNextMorning !== undefined && r.painNextMorning > 2) return 'Back off';
  if (r.painDuring === undefined || r.painNextMorning === undefined) return 'Pending';
  return 'OK';
}
