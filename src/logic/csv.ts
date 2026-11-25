import { EVENING, EXERCISES, LADDERS, SESSION_NAMES, exerciseName } from '../data/plan';
import type { EntryLog, SessionId, SetLog, Workout } from '../types';
import { toISO } from './dates';

export const CSV_COLUMNS = ['Date', 'Session', 'Exercise', 'Sets', 'Reps', 'Load (kg)', 'Hold (s) or carry (m)', 'RPE', 'Knee pain', 'Notes'];

const esc = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Join per-set values: "12" if all the same, otherwise "12/12/10". */
function joinVals(vals: (number | undefined)[]): string {
  const v = vals.filter((x): x is number => x !== undefined);
  if (!v.length) return '';
  return v.every((x) => x === v[0]) ? String(v[0]) : v.join('/');
}

export function workoutsToCSV(workouts: Workout[]): string {
  const rows = [CSV_COLUMNS.join(',')];
  const sorted = [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const w of sorted) {
    for (const e of w.entries) {
      const holdOrCarry = joinVals(e.sets.map((s) => s.holdS ?? s.carryM));
      rows.push(
        [w.date, SESSION_NAMES[w.session], exerciseName(e.exerciseId, e.name), e.sets.length,
          joinVals(e.sets.map((s) => s.reps)), joinVals(e.sets.map((s) => s.loadKg)), holdOrCarry,
          e.rpe, e.pain, e.notes].map(esc).join(','),
      );
    }
  }
  return rows.join('\n');
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  const t = text.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

/** Accepts 2026-11-25, 25/11/2026 (day first), 25.11.2026, or anything Date can parse. */
export function parseDate(s: string): string | null {
  const v = s.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : toISO(d);
}

/** Exercise ids that belong to the evening routine (used to split old "Daily routine" rows). */
const EVENING_IDS = new Set(EVENING.flatMap((s) => (s.ladder ? LADDERS[s.ref as keyof typeof LADDERS].levels : [s.ref])));

/** Leg day A/B, morning or evening. A plain "Daily routine" row goes to evening if the exercise is an evening one. */
export function parseSession(s: string, exerciseId = ''): SessionId {
  const v = s.toLowerCase().trim();
  if (/\b(a|leg ?day ?a|lega)\b/.test(v) || v.endsWith(' a')) return 'legA';
  if (/\b(b|leg ?day ?b|legb)\b/.test(v) || v.endsWith(' b')) return 'legB';
  if (/morning|\bam\b/.test(v)) return 'morning';
  if (/evening|night|\bpm\b/.test(v)) return 'evening';
  return EVENING_IDS.has(exerciseId) ? 'evening' : 'morning';
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function matchExercise(name: string): string {
  const n = norm(name);
  for (const e of EXERCISES) if (norm(e.name) === n || e.aliases?.some((a) => norm(a) === n)) return e.id;
  for (const e of EXERCISES) if (n.length > 4 && (norm(e.name).includes(n) || n.includes(norm(e.name)))) return e.id;
  return `custom:${name.trim()}`;
}

function nums(s: string): number[] {
  return s.split(/[/;,x×\s]+/).map((x) => parseFloat(x)).filter((x) => !isNaN(x));
}

export interface ImportResult {
  workouts: Workout[];
  skipped: string[];
}

export function csvToWorkouts(text: string): ImportResult {
  const rows = parseCSV(text);
  const skipped: string[] = [];
  if (!rows.length) return { workouts: [], skipped };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (prefix: string) => header.findIndex((h) => h.startsWith(prefix));
  const idx = {
    date: col('date'), session: col('session'), exercise: col('exercise'), sets: col('sets'), reps: col('reps'),
    load: col('load'), hold: col('hold'), rpe: col('rpe'), pain: col('knee'), notes: col('notes'),
  };
  if (idx.date < 0 || idx.exercise < 0) return { workouts: [], skipped: ['Missing Date or Exercise column'] };

  const map = new Map<string, Workout>();
  rows.slice(1).forEach((r, i) => {
    const get = (k: keyof typeof idx) => (idx[k] >= 0 ? (r[idx[k]] ?? '').trim() : '');
    const date = parseDate(get('date'));
    const exName = get('exercise');
    if (!date || !exName) { skipped.push(`Row ${i + 2}: missing or unreadable date/exercise`); return; }
    const exerciseId = matchExercise(exName);
    const session = parseSession(get('session'), exerciseId);
    const reps = nums(get('reps'));
    const loads = nums(get('load'));
    const holds = nums(get('hold'));
    const nSets = parseInt(get('sets')) || Math.max(reps.length, loads.length, holds.length, 1);
    const isCarry = exerciseId === 'farmers' || /carry|walk/i.test(exName);
    const pick = (arr: number[], k: number) => (arr.length ? arr[Math.min(k, arr.length - 1)] : undefined);
    const sets: SetLog[] = Array.from({ length: nSets }, (_, k) => ({
      reps: pick(reps, k),
      loadKg: pick(loads, k),
      ...(isCarry ? { carryM: pick(holds, k) } : { holdS: pick(holds, k) }),
    }));
    const rpe = parseFloat(get('rpe'));
    const pain = parseFloat(get('pain'));
    const entry: EntryLog = {
      exerciseId,
      name: exerciseId.startsWith('custom:') ? exName : undefined,
      sets,
      rpe: isNaN(rpe) ? undefined : rpe,
      pain: isNaN(pain) ? undefined : pain,
      notes: get('notes') || undefined,
    };
    const key = `${date}|${session}`;
    if (!map.has(key)) map.set(key, { date, session, entries: [] });
    map.get(key)!.entries.push(entry);
  });
  return { workouts: [...map.values()], skipped };
}
