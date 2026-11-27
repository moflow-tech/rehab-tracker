export type Metric = 'reps' | 'hold' | 'carry';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'band';
export type LadderId = 'tibialis' | 'balance' | 'shortfoot' | 'wallsit' | 'squat';
export type SessionId = 'legA' | 'legB' | 'morning' | 'evening' | 'finisher';
export type RoutineId = 'morning' | 'evening' | 'finisher';
export type Phase = '20' | '45';

export interface Dose {
  sets: number;
  /** exact reps, or bottom of the range */
  reps?: number;
  /** top of the rep range */
  repsMax?: number;
  holdS?: number;
  carryM?: number;
  perSide?: boolean;
  /** free text shown after the numbers, e.g. "3 s hold" */
  note?: string;
}

export interface Exercise {
  id: string;
  name: string;
  metric: Metric;
  equipment: Equipment;
  dose: Dose;
  howTo: string;
  cues: string[];
  mistake: string;
  why: string;
  illustration?: string;
  photos?: string[];
  photoNote?: string;
  ladder?: LadderId;
  level?: number;
  aliases?: string[];
}

export interface Ladder {
  id: LadderId;
  name: string;
  levels: string[]; // exercise ids, level 1 first
  quality: string; // what "clean" means
}

export interface Slot {
  /** exercise id, or ladder id for a progression slot */
  ref: string;
  ladder?: boolean;
  dose?: Dose;
  pair?: string;
}

export interface SetLog {
  reps?: number;
  loadKg?: number;
  holdS?: number;
  carryM?: number;
}

export interface EntryLog {
  exerciseId: string;
  /** free-text name for exercises not in the plan (e.g. CSV import) */
  name?: string;
  slotRef?: string;
  target?: Dose;
  sets: SetLog[];
  rpe?: number;
  pain?: number;
  notes?: string;
  clean?: boolean;
}

export interface Workout {
  id?: number;
  date: string; // YYYY-MM-DD
  session: SessionId;
  entries: EntryLog[];
  notes?: string;
  /** knee pain for the whole session */
  pain?: number;
}

export type Swelling = 'None' | 'Mild' | 'Moderate' | 'Marked';

export interface DailyItem {
  done: boolean;
  clean?: boolean;
  exerciseId?: string;
}

export interface DailyLog {
  date: string;
  items: Record<string, DailyItem>;
  walkingPain?: number;
  /** knee pain on waking this morning (= "next-morning pain" for yesterday) */
  morningPain?: number;
  swelling?: Swelling;
  notes?: string;
}

export interface WeeklyTest {
  date: string;
  walkingPain?: number;
  ktwR?: number;
  ktwL?: number;
  balR?: number;
  balL?: number;
  heelRaiseR?: number;
  heelRaiseL?: number;
  heelWalkM?: number;
  shortFootHolds?: number;
}

export interface Run {
  id?: number;
  date: string;
  description?: string;
  minutes?: number;
  painDuring?: number;
  painNextMorning?: number;
  notes?: string;
  /** return-to-running stage (1-based) this run was done at */
  stage?: number;
}

export interface LadderState {
  level: number;
  since: string;
}

export interface Settings {
  phase: Phase;
  phaseDelayUntil?: string;
  steps: Record<Equipment, number>;
  ladders: Record<LadderId, LadderState>;
  lastBackup?: string;
  welcomeDone?: boolean;
  /** running-gate checklist, by RUN_GATE id */
  runGate?: Record<string, boolean>;
  /** current return-to-running stage, 1-based */
  runStage?: number;
  runStageSince?: string;
}
