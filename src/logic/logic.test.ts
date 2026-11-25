import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, EX } from '../data/plan';
import type { DailyLog, EntryLog, Settings, Workout } from '../types';
import { csvToWorkouts, workoutsToCSV } from './csv';
import { backoffStatus, painZone, runFlag } from './pain';
import { dayPlan, doseText, phasePrompt, scaleDose } from './plan';
import { bestE1RM, cleanStreak, epley, estimateRPE, history, ladderAttempts, ladderReady, suggestLoad } from './progression';
import { completion7, weeklySummary } from './summary';
import { buildSteps, totalSeconds } from './timer';
import { LADDERS } from '../data/plan';

const entry = (exerciseId: string, reps: number[], load: number, rpe?: number, pain?: number): EntryLog => ({
  exerciseId,
  sets: reps.map((r) => ({ reps: r, loadKg: load })),
  rpe,
  pain,
});
const wo = (date: string, entries: EntryLog[], session: Workout['session'] = 'legA'): Workout => ({ date, session, entries });

describe('Epley 1RM', () => {
  it('computes load × (1 + reps/30)', () => {
    expect(epley(100, 10)).toBeCloseTo(133.33, 2);
    expect(epley(60, 1)).toBeCloseTo(62);
  });
  it('ignores sets above 12 reps or without load', () => {
    expect(epley(50, 13)).toBeNull();
    expect(epley(0, 10)).toBeNull();
    expect(epley(undefined, 5)).toBeNull();
  });
  it('takes the best set of an entry', () => {
    expect(bestE1RM({ exerciseId: 'x', sets: [{ reps: 12, loadKg: 60 }, { reps: 15, loadKg: 70 }, { reps: 8, loadKg: 65 }] })).toBeCloseTo(84);
  });
});

describe('pain rule', () => {
  it('classifies zones', () => {
    expect(painZone(2)).toBe('safe');
    expect(painZone(3)).toBe('settle');
    expect(painZone(5)).toBe('settle');
    expect(painZone(6)).toBe('backoff');
  });

  it('backs off for 3 days after pain above 5', () => {
    const daily: DailyLog[] = [{ date: '2026-12-01', items: {}, walkingPain: 6 }];
    expect(backoffStatus('2026-12-01', daily, [], [], []).active).toBe(true);
    expect(backoffStatus('2026-12-03', daily, [], [], []).until).toBe('2026-12-03');
    expect(backoffStatus('2026-12-04', daily, [], [], []).active).toBe(false);
  });

  it('allows 3–5 pain if it settles by next morning', () => {
    const settled: DailyLog[] = [
      { date: '2026-12-01', items: {}, walkingPain: 4 },
      { date: '2026-12-02', items: {}, morningPain: 1 },
    ];
    expect(backoffStatus('2026-12-02', settled, [], [], []).active).toBe(false);
    const notSettled: DailyLog[] = [settled[0], { date: '2026-12-02', items: {}, morningPain: 3 }];
    expect(backoffStatus('2026-12-02', notSettled, [], [], []).active).toBe(true);
  });

  it('counts workout pain and weekly walking-pain increases', () => {
    const w = [wo('2026-12-07', [entry('leg-press', [12, 12, 12], 80, 7, 7)])];
    expect(backoffStatus('2026-12-08', [], w, [], []).active).toBe(true);
    const tests = [{ date: '2026-11-29', walkingPain: 2 }, { date: '2026-12-06', walkingPain: 3 }];
    expect(backoffStatus('2026-12-06', [], [], tests, []).reason).toMatch(/Weekly walking pain/);
  });

  it('flags runs', () => {
    expect(runFlag({ date: 'x', painDuring: 5, painNextMorning: 2 })).toBe('OK');
    expect(runFlag({ date: 'x', painDuring: 6, painNextMorning: 0 })).toBe('Back off');
    expect(runFlag({ date: 'x', painDuring: 3, painNextMorning: 3 })).toBe('Back off');
    expect(runFlag({ date: 'x', painDuring: 3 })).toBe('Pending');
  });
});

describe('load progression', () => {
  const dose = EX['leg-press'].dose; // 3×12
  it('goes up 2.5–5% when the top of the range is hit at RPE ≤ 8 and pain ≤ 3', () => {
    const h = history([wo('2026-12-01', [entry('leg-press', [12, 12, 12], 80, 8, 2)])], 'leg-press');
    const s = suggestLoad(h, dose, 2.5)!;
    expect(s.hint).toBe('up');
    expect(s.loadKg).toBe(82.5);
  });
  it('rounds to at least one equipment step', () => {
    const h = history([wo('2026-12-01', [entry('db-rdl', [10, 10, 10], 12, 7, 0)])], 'db-rdl');
    expect(suggestLoad(h, EX['db-rdl'].dose, 2)!.loadKg).toBe(14);
  });
  it('stays when RPE is too high, pain too high, or reps missed', () => {
    for (const e of [entry('leg-press', [12, 12, 12], 80, 9, 1), entry('leg-press', [12, 12, 12], 80, 7, 4), entry('leg-press', [12, 12, 11], 80, 7, 1)]) {
      expect(suggestLoad(history([wo('2026-12-01', [e])], 'leg-press'), dose, 2.5)!.hint).toBe('same');
    }
  });
  it('uses the top of a rep range', () => {
    const d = { sets: 3, reps: 15, repsMax: 20 };
    const e = { ...entry('hip-abd', [16, 16, 16], 40, 7, 0), target: d };
    expect(suggestLoad(history([wo('2026-12-01', [e])], 'hip-abd'), d, 2.5)!.hint).toBe('same');
  });
  it('suggests dropping after missing the bottom twice', () => {
    const h = history([
      wo('2026-12-01', [entry('leg-press', [10, 9, 8], 100, 9, 1)]),
      wo('2026-12-08', [entry('leg-press', [11, 9, 9], 100, 9, 1)]),
    ], 'leg-press');
    const s = suggestLoad(h, dose, 2.5)!;
    expect(s.hint).toBe('down');
    expect(s.loadKg).toBe(95);
  });
  it('estimates RPE from rep drop-off when none is typed', () => {
    expect(estimateRPE(entry('leg-press', [12, 12, 12], 80), dose)).toBe(8);
    const range = { sets: 3, reps: 15, repsMax: 20 };
    expect(estimateRPE(entry('hip-abd', [20, 20, 19], 40), range)).toBe(9);
    expect(estimateRPE(entry('hip-abd', [20, 18, 17], 40), range)).toBe(10);
    expect(estimateRPE(entry('leg-press', [12, 12, 11], 80), dose)).toBe(10); // missed the 12-rep target
    expect(estimateRPE({ exerciseId: 'leg-press', sets: [{ reps: 12, loadKg: 80 }] }, dose)).toBeNull();
  });
  it('without typed RPE, needs the top of the range two sessions running before going up', () => {
    const one = history([wo('2026-12-01', [entry('leg-press', [12, 12, 12], 80, undefined, 1)])], 'leg-press');
    const s1 = suggestLoad(one, dose, 2.5)!;
    expect(s1.hint).toBe('same');
    expect(s1.message).toMatch(/once more/);
    const two = history([
      wo('2026-11-24', [entry('leg-press', [12, 12, 12], 80, undefined, 2)]),
      wo('2026-12-01', [entry('leg-press', [12, 12, 12], 80, undefined, 1)]),
    ], 'leg-press');
    expect(suggestLoad(two, dose, 2.5)!.loadKg).toBe(82.5);
    // the earlier session was at a lighter load: not enough data yet
    const lighter = history([
      wo('2026-11-24', [entry('leg-press', [12, 12, 12], 77.5, undefined, 2)]),
      wo('2026-12-01', [entry('leg-press', [12, 12, 12], 80, undefined, 1)]),
    ], 'leg-press');
    expect(suggestLoad(lighter, dose, 2.5)!.hint).toBe('same');
  });
  it('asks for knee pain before suggesting a jump', () => {
    const h = history([wo('2026-12-01', [entry('leg-press', [12, 12, 12], 80, 7)])], 'leg-press');
    expect(suggestLoad(h, dose, 2.5)!.message).toMatch(/log knee pain/);
  });
  it('halves the load while backing off', () => {
    const h = history([wo('2026-12-01', [entry('leg-press', [12, 12, 12], 85, 7, 1)])], 'leg-press');
    expect(suggestLoad(h, dose, 2.5, true)!.loadKg).toBe(42.5);
  });
});

describe('progression ladders', () => {
  const day = (date: string, clean: boolean, exerciseId = 'tib-1'): DailyLog => ({ date, items: { tibialis: { done: true, clean, exerciseId } } });
  const settings: Settings = DEFAULT_SETTINGS;

  it('is ready after 3 clean sessions in a row', () => {
    const daily = [day('2026-11-26', true), day('2026-11-27', true), day('2026-11-28', true)];
    expect(ladderReady('tibialis', settings, ladderAttempts('tibialis', daily, [], {}))).toBe(true);
  });
  it('is not ready if one of the last 3 was not clean', () => {
    const daily = [day('2026-11-26', true), day('2026-11-27', false), day('2026-11-28', true)];
    expect(ladderReady('tibialis', settings, ladderAttempts('tibialis', daily, [], {}))).toBe(false);
  });
  it('only counts sessions since reaching the level', () => {
    const s: Settings = { ...settings, ladders: { ...settings.ladders, tibialis: { level: 1, since: '2026-11-27' } } };
    const daily = [day('2026-11-26', true), day('2026-11-27', true), day('2026-11-28', true)];
    expect(ladderReady('tibialis', s, ladderAttempts('tibialis', daily, [], {}))).toBe(false);
  });
  it('counts logged workouts only when the dose was met and marked clean', () => {
    const tib = (date: string, reps: number) => wo(date, [{ exerciseId: 'tib-1', clean: true, sets: [{ reps }, { reps }, { reps }] }], 'legB');
    const doses = { 'tib-1': EX['tib-1'].dose };
    expect(ladderReady('tibialis', settings, ladderAttempts('tibialis', [], [tib('2026-11-26', 15), tib('2026-11-27', 15), tib('2026-11-28', 15)], doses))).toBe(true);
    expect(ladderReady('tibialis', settings, ladderAttempts('tibialis', [], [tib('2026-11-26', 15), tib('2026-11-27', 12), tib('2026-11-28', 15)], doses))).toBe(false);
  });
  it('counts the clean streak toward the next level', () => {
    const daily = [day('2026-11-26', false), day('2026-11-27', true), day('2026-11-28', true)];
    expect(cleanStreak('tibialis', settings, ladderAttempts('tibialis', daily, [], {}))).toBe(2);
  });
  it('never suggests past the top level', () => {
    const s: Settings = { ...settings, ladders: { ...settings.ladders, shortfoot: { level: 3, since: '2026-11-25' } } };
    const daily = ['2026-11-26', '2026-11-27', '2026-11-28'].map((d) => ({ date: d, items: { shortfoot: { done: true, clean: true, exerciseId: 'sf-3' } } }));
    expect(ladderReady('shortfoot', s, ladderAttempts('shortfoot', daily, [], {}))).toBe(false);
  });
});

describe('schedule and doses', () => {
  it('puts leg day A on Monday and B on Thursday, with only balance in the evening', () => {
    const mon = dayPlan('2026-11-30');
    expect(mon.legDay).toBe('legA');
    expect(mon.evening.map((s) => s.ref)).toEqual(['balance']);
    expect(dayPlan('2026-12-03').legDay).toBe('legB');
    expect(dayPlan('2026-12-02').evening).toHaveLength(5);
  });
  it('halves doses on Sundays', () => {
    const sun = dayPlan('2026-11-29');
    expect(sun.isSunday).toBe(true);
    expect(sun.doseScale).toBe(0.5);
    expect(scaleDose({ sets: 2, reps: 10 }, 0.5)).toMatchObject({ sets: 1, reps: 10 });
    expect(scaleDose({ sets: 3, holdS: 30 }, 0.5)).toMatchObject({ sets: 3, holdS: 15 });
  });
  it('formats doses', () => {
    expect(doseText({ sets: 3, reps: 15, repsMax: 20 })).toBe('3×15–20');
    expect(doseText({ sets: 2, reps: 10, holdS: 5, perSide: true })).toBe('2×10, 5 s hold each');
    expect(doseText({ sets: 3, carryM: 30 })).toBe('3×30 m');
  });
  it('prompts the 45-min switch from 14 Dec unless delayed', () => {
    expect(phasePrompt('2026-12-13', DEFAULT_SETTINGS)).toBe(false);
    expect(phasePrompt('2026-12-14', DEFAULT_SETTINGS)).toBe(true);
    expect(phasePrompt('2026-12-15', { ...DEFAULT_SETTINGS, phaseDelayUntil: '2026-12-21' })).toBe(false);
    expect(phasePrompt('2026-12-15', { ...DEFAULT_SETTINGS, phase: '45' })).toBe(false);
  });
});

describe('summary', () => {
  it('reports improvements and stalls', () => {
    const tests = [
      { date: '2026-11-29', ktwR: 10, walkingPain: 3 },
      { date: '2026-12-06', ktwR: 10, walkingPain: 3 },
      { date: '2026-12-13', ktwR: 10, walkingPain: 3 },
      { date: '2026-12-20', ktwR: 10, walkingPain: 2 },
    ];
    const s = weeklySummary(tests, [])!;
    expect(s.improved.join()).toMatch(/Walking knee pain: 3 → 2/);
    expect(s.stalled.join()).toMatch(/Knee-to-wall R/);
  });
  it('counts rep gains at the same load as progress, not a stall', () => {
    const tests = [{ date: '2026-12-20', ktwR: 12 }];
    const w = [
      wo('2026-11-30', [entry('hip-abd', [15, 15, 15], 40)]),
      wo('2026-12-21', [entry('hip-abd', [19, 19, 19], 40)]),
      wo('2026-12-01', [entry('leg-ext', [15, 15, 15], 25)]),
      wo('2026-12-22', [entry('leg-ext', [15, 15, 15], 25)]),
    ];
    const s = weeklySummary(tests, w)!;
    expect(s.stalled.join()).not.toMatch(/hip abduction/);
    expect(s.stalled.join()).toMatch(/Leg extension/);
  });
  it('computes 7-day completion', () => {
    const all = (date: string): DailyLog => ({
      date,
      items: Object.fromEntries([...dayPlan(date).morning, ...dayPlan(date).evening].map((s) => [s.ref, { done: true }])),
    });
    expect(completion7('2026-12-06', ['2026-12-06', '2026-12-05'].map(all))).toBeCloseTo(4 / 14);
  });
});

describe('CSV', () => {
  it('round-trips workouts', () => {
    const w = [wo('2026-12-01', [{ ...entry('leg-press', [12, 12, 10], 80, 8, 2), notes: 'felt "good", easy' }])];
    const back = csvToWorkouts(workoutsToCSV(w)).workouts;
    expect(back[0].session).toBe('legA');
    expect(back[0].entries[0].exerciseId).toBe('leg-press');
    expect(back[0].entries[0].sets.map((s) => s.reps)).toEqual([12, 12, 10]);
    expect(back[0].entries[0].notes).toBe('felt "good", easy');
  });
  it('imports a spreadsheet export with day-first dates and unknown exercises', () => {
    const csv = 'Date,Session,Exercise,Sets,Reps,Load (kg),Hold (s) or carry (m),RPE,Knee pain,Notes\n' +
      '02/12/2026,Leg day B,Dumbbell RDL,3,10,14,,7,1,\n' +
      "02/12/2026,Leg day B,Farmer's carry,3,,20,30,8,0,\n" +
      '03/12/2026,Daily routine,Mystery stretch,1,,,60,,,\n' +
      '03/12/2026,Daily routine,Side plank with top-leg lift,2,,,20,,0,';
    const { workouts } = csvToWorkouts(csv);
    expect(workouts).toHaveLength(3);
    expect(workouts[0].date).toBe('2026-12-02');
    expect(workouts[0].entries[1].sets[0]).toMatchObject({ loadKg: 20, carryM: 30 });
    expect(workouts[1]).toMatchObject({ session: 'morning' });
    expect(workouts[1].entries[0].exerciseId).toBe('custom:Mystery stretch');
    expect(workouts[2]).toMatchObject({ session: 'evening' });
    expect(workouts[2].entries[0].exerciseId).toBe('side-plank');
  });
});

describe('guided timer', () => {
  it('builds holds per side with switches and rests', () => {
    const steps = buildSteps({ sets: 3, holdS: 30, perSide: true });
    const kinds = steps.map((s) => s.kind);
    expect(kinds.filter((k) => k === 'hold')).toHaveLength(6);
    expect(kinds.filter((k) => k === 'switch')).toHaveLength(3);
    expect(kinds.filter((k) => k === 'rest')).toHaveLength(2);
    expect(steps[1]).toMatchObject({ kind: 'hold', side: 'Right', set: 1 });
    expect(steps[3]).toMatchObject({ kind: 'hold', side: 'Left', set: 1 });
  });
  it('builds reps with short holds and relax gaps', () => {
    const steps = buildSteps({ sets: 2, reps: 10, holdS: 5 });
    expect(steps.filter((s) => s.kind === 'hold')).toHaveLength(20);
    expect(steps.filter((s) => s.kind === 'relax')).toHaveLength(18);
    expect(totalSeconds(steps)).toBe(5 + 20 * 5 + 18 * 3 + 20);
  });
  it('skips exercises without timed holds', () => {
    expect(buildSteps({ sets: 3, reps: 15 })).toEqual([]);
  });
});

describe('new ladders', () => {
  it('has wall-distance steps, wall-sit depths and the squat progression', () => {
    expect(LADDERS.tibialis.levels.slice(4)).toEqual(['tib-5', 'tib-6', 'tib-7']);
    expect(LADDERS.wallsit.levels.map((id) => EX[id].ladder)).toEqual(['wallsit', 'wallsit', 'wallsit']);
    expect(LADDERS.squat.levels).toEqual(['he-squat', 'he-back-squat']);
    expect(dayPlan('2026-12-02').evening.map((s) => s.ref)).toContain('wallsit');
    expect(dayPlan('2026-12-02').morning.map((s) => s.ref)).toEqual(['ktw', 'slant', 'shortfoot', 'toe-yoga', 'tibialis', 'clam', 'clam-side']);
  });
});
