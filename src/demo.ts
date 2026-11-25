// Dev-only: open the app with ?demo to replace all data with 4 weeks of fake logs,
// built so the go-up hint, a ladder level-up and the back-off banner all appear.
// Open with ?demo=clear to erase everything again.
import { DEFAULT_SETTINGS, EVENING, MORNING } from './data/plan';
import { db, eraseAll } from './db';
import { addDays, todayISO, weekday } from './logic/dates';
import type { DailyLog, Workout } from './types';

export async function seedDemo() {
  const mode = new URLSearchParams(location.search).get('demo');
  await eraseAll();
  if (mode === 'clear') return;

  const today = todayISO();
  const daily: DailyLog[] = [];
  const workouts: Workout[] = [];

  for (let i = 27; i >= 0; i--) {
    const date = addDays(today, -i);
    const wd = weekday(date);
    const items: DailyLog['items'] = {};
    const skip = i % 6 === 5; // miss the odd day
    for (const s of [...MORNING, ...(wd === 1 || wd === 4 ? EVENING.slice(0, 1) : EVENING)]) {
      if (skip && s.ref !== 'ktw') continue;
      const exerciseId = s.ladder ? ({ tibialis: 'tib-1', balance: 'bal-1', shortfoot: 'sf-1', wallsit: 'wall-sit-1' } as Record<string, string>)[s.ref] : undefined;
      items[s.ref] = { done: true, exerciseId, clean: s.ref === 'tibialis' ? i <= 3 : s.ladder ? i % 2 === 0 : undefined };
    }
    daily.push({
      date,
      items: i === 0 ? {} : items,
      walkingPain: i === 1 ? 4 : Math.max(1, 4 - Math.floor((27 - i) / 9)),
      morningPain: i === 0 ? 3 : 1,
      swelling: i > 14 ? 'Mild' : 'None',
    });

    if (wd === 1) {
      const k = Math.floor((27 - i) / 7);
      workouts.push({
        date, session: 'legA',
        entries: [
          { exerciseId: 'leg-press', target: { sets: 3, reps: 12 }, sets: [0, 1, 2].map(() => ({ reps: 12, loadKg: 70 + k * 2.5 })), pain: 2 },
          { exerciseId: 'hip-abd', target: { sets: 3, reps: 15, repsMax: 20 }, sets: [0, 1, 2].map(() => ({ reps: 16 + k, loadKg: 40 })), pain: 1 },
          { exerciseId: 'leg-ext', target: { sets: 3, reps: 15 }, sets: [{ reps: 15, loadKg: 25 }, { reps: 13, loadKg: 25 }, { reps: 12, loadKg: 25 }], pain: 3 },
          { exerciseId: 'seated-calf', target: { sets: 3, reps: 15 }, sets: [0, 1, 2].map(() => ({ reps: 15, loadKg: 30 + k * 5 })), pain: 0 },
        ],
      });
    }
    if (wd === 4) {
      const k = Math.floor((27 - i) / 7);
      workouts.push({
        date, session: 'legB',
        entries: [
          { exerciseId: 'db-rdl', target: { sets: 3, reps: 10 }, sets: [0, 1, 2].map(() => ({ reps: 10, loadKg: 14 + k * 2 })), pain: 1 },
          { exerciseId: 'glute-bridge', target: { sets: 3, reps: 12 }, sets: [0, 1, 2].map(() => ({ reps: 12 })), pain: 0 },
          { exerciseId: 'step-up', target: { sets: 3, reps: 8, perSide: true }, sets: [0, 1, 2].map(() => ({ reps: 8, loadKg: 6 })), pain: 3 },
        ],
      });
    }
  }

  const since = addDays(today, -28);
  await db.kv.put({ key: 'settings', value: { ...DEFAULT_SETTINGS, ladders: { tibialis: { level: 1, since }, balance: { level: 1, since }, shortfoot: { level: 1, since } } } });
  await db.daily.bulkPut(daily);
  await db.workouts.bulkAdd(workouts);
  const sundays = [21, 14, 7].map((n) => addDays(today, -n - weekday(addDays(today, -n))));
  await db.tests.bulkPut(
    sundays.map((date, k) => ({ date, walkingPain: 3 - (k > 1 ? 1 : 0), ktwR: 9 + k, ktwL: 15, balR: 6 + k * 4, balL: 9 + k * 3, heelRaiseR: 12 + k * 2, heelRaiseL: 18 + k, heelWalkM: 2 + k * 2, shortFootHolds: 4 + k })),
  );
  await db.runs.bulkAdd([
    { date: addDays(today, -6), description: '6 × (1 min run / 2 min walk)', minutes: 18, painDuring: 3, painNextMorning: 1 },
    { date: addDays(today, -3), description: '8 × (1 min run / 1 min walk)', minutes: 16, painDuring: 6, painNextMorning: 3 },
  ]);
  history.replaceState(null, '', location.pathname);
  location.reload();
}
