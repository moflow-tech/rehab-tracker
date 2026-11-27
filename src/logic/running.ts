import { RUN_GATE, RUN_STAGES } from '../data/plan';
import type { Run, Settings } from '../types';
import { addDays, daysBetween } from './dates';

export const MIN_DAYS_PER_STAGE = 7;
export const RUNS_TO_MOVE_UP = 3;

export function gatePassed(settings: Settings): boolean {
  return RUN_GATE.every((g) => settings.runGate?.[g.id]);
}

/** A run that doesn't call for repeating the stage: pain 3/10 or less during, 2/10 or less the next morning. */
export function cleanRun(r: Run): boolean | undefined {
  if (r.painDuring === undefined || r.painNextMorning === undefined) return undefined;
  return r.painDuring <= 3 && r.painNextMorning <= 2;
}

/**
 * Ready for the next stage: at least a week on this stage, and the last 3 runs at it were clean.
 * Returns the reason when not ready, so the screen can say what's missing.
 */
export function stageStatus(runs: Run[], settings: Settings, today: string): { ready: boolean; text: string } {
  const stage = settings.runStage ?? 1;
  if (stage >= RUN_STAGES.length) return { ready: false, text: 'Last stage. Hold here for 4 pain-free weeks before a half-marathon block.' };
  const since = settings.runStageSince ?? today;
  const atStage = runs.filter((r) => r.stage === stage && r.date >= since).sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = atStage.slice(0, RUNS_TO_MOVE_UP);
  const cleanCount = last.filter((r) => cleanRun(r)).length;
  const days = daysBetween(since, today);
  if (last.some((r) => cleanRun(r) === false)) return { ready: false, text: 'Repeat this stage: a recent run was above 3/10 or worse the next morning.' };
  if (cleanCount < RUNS_TO_MOVE_UP) return { ready: false, text: `${cleanCount} of ${RUNS_TO_MOVE_UP} clean runs at this stage (pain ≤ 3 during, ≤ 2 next morning).` };
  if (days < MIN_DAYS_PER_STAGE) return { ready: false, text: `3 clean runs – stay until ${addDays(since, MIN_DAYS_PER_STAGE)} (at least a week per stage).` };
  return { ready: true, text: '3 clean runs and at least a week on this stage.' };
}

/** The 10% rule: no single run more than about 10% longer than the longest in the past 30 days. */
export function longestRunCap(runs: Run[], today: string): { longest: number; cap: number } | null {
  const recent = runs.filter((r) => r.minutes && r.date <= today && daysBetween(r.date, today) <= 30);
  if (!recent.length) return null;
  const longest = Math.max(...recent.map((r) => r.minutes!));
  return { longest, cap: Math.round(longest * 1.1) };
}
