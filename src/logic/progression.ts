import { LADDERS } from '../data/plan';
import type { DailyLog, Dose, EntryLog, LadderId, Settings, Workout } from '../types';

// ---------- Estimated 1RM ----------

/** Epley: load × (1 + reps/30). Only for loaded sets of 1–12 reps. */
export function epley(loadKg?: number, reps?: number): number | null {
  if (!loadKg || !reps || reps < 1 || reps > 12) return null;
  return loadKg * (1 + reps / 30);
}

export function bestE1RM(entry: EntryLog): number | null {
  let best: number | null = null;
  for (const s of entry.sets) {
    const e = epley(s.loadKg, s.reps);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
}

export function topLoad(entry: EntryLog): number {
  return Math.max(0, ...entry.sets.map((s) => s.loadKg ?? 0));
}

// ---------- History ----------

export interface Dated {
  date: string;
  entry: EntryLog;
}

/** All logged entries for an exercise, newest first. */
export function history(workouts: Workout[], exerciseId: string, before?: string): Dated[] {
  const out: Dated[] = [];
  for (const w of workouts) {
    if (before && w.date >= before) continue;
    for (const e of w.entries) if (e.exerciseId === exerciseId) out.push({ date: w.date, entry: e });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---------- Load suggestion ----------

export type Hint = 'up' | 'same' | 'down' | 'backoff';

export interface Suggestion {
  loadKg: number;
  hint: Hint;
  message: string;
}

const ceilTo = (x: number, step: number) => Math.ceil(x / step - 1e-9) * step;
const floorTo = (x: number, step: number) => Math.floor(x / step + 1e-9) * step;
const round2 = (x: number) => Math.round(x * 100) / 100;

function hitTop(entry: EntryLog, target: Dose): boolean {
  const top = target.repsMax ?? target.reps;
  if (top === undefined || entry.sets.length < target.sets) return false;
  return entry.sets.every((s) => (s.reps ?? 0) >= top);
}

function missedBottom(entry: EntryLog, target: Dose): boolean {
  const bottom = target.reps;
  if (bottom === undefined) return false;
  return entry.sets.some((s) => s.reps !== undefined && s.reps < bottom);
}

/**
 * Estimated RPE from how the reps held up across sets (no typing needed).
 * Reps that stay level at the top of the range → ≤ 8 (reps in reserve);
 * a 1-rep drop-off → ~9; a bigger drop-off or missing the bottom of the range → ~10.
 * Returns null with fewer than 2 sets of reps (not enough data).
 */
export function estimateRPE(entry: EntryLog, target: Dose): number | null {
  const reps = entry.sets.map((s) => s.reps).filter((r): r is number => r !== undefined);
  if (reps.length < 2) return null;
  if (missedBottom(entry, target)) return 10;
  const drop = Math.max(...reps) - Math.min(...reps);
  if (drop >= 2) return 10;
  if (drop === 1) return 9;
  return hitTop(entry, target) ? 8 : 9;
}

/** RPE typed in (e.g. from a CSV import) wins; otherwise the estimate. */
export function effortRPE(entry: EntryLog, target: Dose): number | null {
  return entry.rpe ?? estimateRPE(entry, target);
}

/**
 * Next-session load for a loaded exercise.
 * - Top of the rep range on all sets at RPE ≤ 8 and knee pain ≤ 3 → +2.5–5%, rounded to the equipment step.
 *   Without a typed RPE, "RPE ≤ 8" means the reps held level at the top of the range
 *   in the last TWO sessions at this load (one good day isn't enough data).
 * - Missed the bottom of the range in the last two sessions → suggest ~5% less.
 * - Backing off → half the load.
 */
export function suggestLoad(hist: Dated[], plannedDose: Dose, step: number, backingOff = false): Suggestion | null {
  const last = hist[0];
  if (!last) return null;
  const load = topLoad(last.entry);
  if (load <= 0) return null;
  const target = last.entry.target ?? plannedDose;

  if (backingOff) {
    const l = round2(Math.max(step, floorTo(load * 0.5, step)));
    return { loadKg: l, hint: 'backoff', message: `Backing off: ${l} kg (half of ${load} kg)` };
  }

  const prev = hist[1];
  const { rpe, pain } = last.entry;
  const up = () => {
    const l = round2(Math.max(load + step, ceilTo(load * 1.025, step)));
    const pct = Math.round(((l - load) / load) * 100);
    return { loadKg: l, hint: 'up' as const, message: `Go up: ${l} kg (+${round2(l - load)} kg, ${pct}%)` };
  };

  if (hitTop(last.entry, target)) {
    if (pain === undefined) return { loadKg: load, hint: 'same', message: `Top of the range at ${load} kg – log knee pain to get a go-up hint` };
    if (pain <= 3) {
      if (rpe !== undefined) {
        if (rpe <= 8) return up();
      } else {
        const prevTarget = prev?.entry.target ?? plannedDose;
        const prevOk = prev && topLoad(prev.entry) >= load && hitTop(prev.entry, prevTarget) && (prev.entry.pain ?? 0) <= 3;
        if (prevOk) return up();
        return { loadKg: load, hint: 'same', message: `Top of the range at ${load} kg – do it once more to go up` };
      }
    }
  }

  if (prev && missedBottom(last.entry, target) && missedBottom(prev.entry, prev.entry.target ?? plannedDose)) {
    const l = round2(Math.max(step, floorTo(load * 0.95, step)));
    return { loadKg: l, hint: 'down', message: `Missed the bottom of the range twice – keep ${load} kg or drop to ${l} kg` };
  }

  return { loadKg: load, hint: 'same', message: `Stay at ${load} kg and beat last time's reps` };
}

// ---------- Progression ladders ----------

export interface Attempt {
  date: string;
  exerciseId: string;
  clean: boolean;
}

/** Did a logged entry meet its planned dose? */
export function metDose(entry: EntryLog, dose: Dose): boolean {
  if (entry.sets.length < dose.sets) return false;
  return entry.sets.every((s) => {
    if (dose.reps !== undefined && (s.reps ?? 0) < (dose.repsMax ?? dose.reps)) return false;
    if (dose.holdS !== undefined && dose.reps === undefined && (s.holdS ?? 0) < dose.holdS) return false;
    return true;
  });
}

/** Attempts at ladder exercises, from both the Today checklist and logged workouts. Newest first. */
export function ladderAttempts(ladder: LadderId, daily: DailyLog[], workouts: Workout[], doses: Record<string, Dose>): Attempt[] {
  const ids = new Set(LADDERS[ladder].levels);
  const byKey = new Map<string, Attempt>();
  for (const d of daily) {
    const item = d.items[ladder];
    if (item?.done && item.exerciseId && ids.has(item.exerciseId)) {
      byKey.set(`${d.date}|${item.exerciseId}`, { date: d.date, exerciseId: item.exerciseId, clean: !!item.clean });
    }
  }
  for (const w of workouts) {
    for (const e of w.entries) {
      if (!ids.has(e.exerciseId)) continue;
      const clean = !!e.clean && metDose(e, e.target ?? doses[e.exerciseId]);
      const key = `${w.date}|${e.exerciseId}`;
      const prev = byKey.get(key);
      // one attempt per day: a clean result from either source counts
      byKey.set(key, { date: w.date, exerciseId: e.exerciseId, clean: clean || !!prev?.clean });
    }
  }
  return [...byKey.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const LEVEL_UP_STREAK = 3;

/** Clean sessions in a row (newest first) at the current level since reaching it, capped at the streak needed. */
export function cleanStreak(ladder: LadderId, settings: Settings, attempts: Attempt[]): number {
  const { level, since } = settings.ladders[ladder];
  const current = LADDERS[ladder].levels[level - 1];
  let n = 0;
  for (const a of attempts) {
    if (a.exerciseId !== current || a.date < since) continue;
    if (!a.clean) break;
    if (++n === LEVEL_UP_STREAK) break;
  }
  return n;
}

/** Ready to move up: the last 3 attempts at the current level (since reaching it) were all clean. */
export function ladderReady(ladder: LadderId, settings: Settings, attempts: Attempt[]): boolean {
  if (settings.ladders[ladder].level >= LADDERS[ladder].levels.length) return false;
  return cleanStreak(ladder, settings, attempts) === LEVEL_UP_STREAK;
}
