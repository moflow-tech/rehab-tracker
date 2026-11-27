import { EVENING, EX, FINISHER, LADDERS, LEG_DAYS, MORNING, PHASE_SWITCH_DATE } from '../data/plan';
import type { DailyLog, Dose, Exercise, LadderId, Phase, RoutineId, Settings, Slot } from '../types';
import { weekday } from './dates';

export interface DayPlan {
  date: string;
  legDay: 'legA' | 'legB' | null;
  isSunday: boolean;
  /** empty on Sundays (rest morning) */
  morning: Slot[];
  /** every day, leg days included */
  evening: Slot[];
  /** Tuesdays and Fridays, after the upper-body session */
  finisher: Slot[];
  /** 1 normally; 0.5 on Sundays and while backing off */
  doseScale: number;
}

export function dayPlan(date: string, backingOff = false): DayPlan {
  const wd = weekday(date);
  const legDay = wd === 1 ? 'legA' : wd === 4 ? 'legB' : null;
  const isSunday = wd === 0;
  return {
    date,
    legDay,
    isSunday,
    morning: isSunday ? [] : MORNING,
    evening: EVENING,
    finisher: wd === 2 || wd === 5 ? FINISHER : [],
    doseScale: isSunday || backingOff ? 0.5 : 1,
  };
}

/** Halve a dose: even set counts halve the sets, otherwise halve reps/holds (rounded up). */
export function scaleDose(dose: Dose, factor: number): Dose {
  if (factor === 1) return dose;
  if (dose.sets > 1 && dose.sets % 2 === 0) return { ...dose, sets: Math.ceil(dose.sets * factor) };
  const half = (n?: number) => (n === undefined ? undefined : Math.ceil(n * factor));
  return { ...dose, reps: half(dose.reps), repsMax: half(dose.repsMax), holdS: half(dose.holdS), carryM: half(dose.carryM) };
}

export function doseText(d: Dose): string {
  let main = `${d.sets}×`;
  if (d.reps !== undefined) main += d.repsMax ? `${d.reps}–${d.repsMax}` : `${d.reps}`;
  if (d.holdS !== undefined) main += d.reps !== undefined ? `, ${d.holdS} s hold` : `${d.holdS} s`;
  if (d.carryM !== undefined) main += `${d.carryM} m`;
  if (d.perSide) main += ' each';
  return d.note ? `${main} (${d.note})` : main;
}

export function ladderExercise(id: LadderId, settings: Settings): Exercise {
  const ladder = LADDERS[id];
  const lvl = Math.min(Math.max(settings.ladders[id].level, 1), ladder.levels.length);
  return EX[ladder.levels[lvl - 1]];
}

export function resolveSlot(slot: Slot, settings: Settings): { exercise: Exercise; dose: Dose } {
  const exercise = slot.ladder ? ladderExercise(slot.ref as LadderId, settings) : EX[slot.ref];
  return { exercise, dose: slot.dose ?? exercise.dose };
}

export const ROUTINE_SLOTS: Record<RoutineId, Slot[]> = { morning: MORNING, evening: EVENING, finisher: FINISHER };

/** The routines due on a day, in order. */
export function dueRoutines(plan: DayPlan): RoutineId[] {
  return (['morning', 'evening', 'finisher'] as RoutineId[]).filter((r) => plan[r].length > 0);
}

/** Every slot is done. An empty list (nothing due) counts as done. */
export function slotsDone(slots: Slot[], log?: DailyLog): boolean {
  return slots.length === 0 || (!!log && slots.every((s) => log.items[s.ref]?.done));
}

export function legDaySlots(session: 'legA' | 'legB', phase: Phase): Slot[] {
  return LEG_DAYS[phase][session];
}

export function phasePrompt(today: string, settings: Settings): boolean {
  if (settings.phase !== '20' || today < PHASE_SWITCH_DATE) return false;
  return !settings.phaseDelayUntil || today >= settings.phaseDelayUntil;
}
