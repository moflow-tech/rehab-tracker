import type { Dose } from '../types';

export interface Step {
  kind: 'ready' | 'hold' | 'relax' | 'rest' | 'switch';
  secs: number;
  set: number;
  sets: number;
  side?: 'Right' | 'Left';
  rep?: number;
  reps?: number;
}

export const READY_S = 5;
export const RELAX_S = 3;
export const SWITCH_S = 8;
export const REST_S = 20;

/** Whether an exercise has timed holds the guided timer can run. */
export function isTimed(d: Dose): boolean {
  return d.holdS !== undefined && d.holdS > 0;
}

/**
 * Turn a dose into a sequence of timed steps.
 * - Holds only (e.g. 3×30 s each): hold, switch sides, rest between sets.
 * - Reps with a hold (e.g. 2×10, 5 s hold each): hold, short relax between reps.
 */
export function buildSteps(d: Dose): Step[] {
  if (!isTimed(d)) return [];
  const sides: (Step['side'] | undefined)[] = d.perSide ? ['Right', 'Left'] : [undefined];
  const reps = d.reps ?? 1;
  const steps: Step[] = [{ kind: 'ready', secs: READY_S, set: 1, sets: d.sets }];
  for (let set = 1; set <= d.sets; set++) {
    sides.forEach((side, si) => {
      for (let rep = 1; rep <= reps; rep++) {
        steps.push({ kind: 'hold', secs: d.holdS!, set, sets: d.sets, side, rep: d.reps ? rep : undefined, reps: d.reps });
        if (rep < reps) steps.push({ kind: 'relax', secs: RELAX_S, set, sets: d.sets, side });
      }
      if (si < sides.length - 1) steps.push({ kind: 'switch', secs: SWITCH_S, set, sets: d.sets, side: sides[si + 1] });
    });
    if (set < d.sets) steps.push({ kind: 'rest', secs: REST_S, set: set + 1, sets: d.sets, side: sides[0] });
  }
  return steps;
}

export function totalSeconds(steps: Step[]): number {
  return steps.reduce((a, s) => a + s.secs, 0);
}

export function clock(secs: number): string {
  const s = Math.max(0, Math.ceil(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
