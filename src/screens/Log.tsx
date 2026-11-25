import { useEffect, useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { RestButton } from '../components/Timer';
import { Num, PainPicker, Toast, useToast } from '../components/ui';
import { EX, EXERCISES, LADDERS, SESSION_NAMES, exerciseName } from '../data/plan';
import { db, getDaily, saveDaily } from '../db';
import { formatDay } from '../logic/dates';
import { dayPlan, doseText, legDaySlots, resolveSlot, scaleDose } from '../logic/plan';
import { effortRPE, history, suggestLoad, topLoad, type Suggestion } from '../logic/progression';
import type { Dose, EntryLog, Exercise, SessionId, SetLog, Slot, Workout } from '../types';

const LOADED = new Set(['barbell', 'dumbbell', 'machine', 'cable']);

function setsFor(dose: Dose, load?: number): SetLog[] {
  return Array.from({ length: dose.sets }, () => ({
    reps: dose.repsMax ?? dose.reps,
    holdS: dose.holdS,
    carryM: dose.carryM,
    loadKg: load,
  }));
}

function rpeText(e: EntryLog, target?: Dose): string {
  if (!target) return '';
  const r = effortRPE(e, target);
  if (r === null) return '';
  if (e.rpe !== undefined) return `, RPE ${e.rpe}`;
  return r <= 8 ? ', est. RPE ≤8' : `, est. RPE ~${r}`;
}

const ROUTINE = (s: SessionId): s is 'morning' | 'evening' => s === 'morning' || s === 'evening';

function lastText(e: EntryLog, target?: Dose): string {
  const reps = e.sets.map((s) => s.reps ?? s.holdS ?? s.carryM ?? '–');
  const same = reps.every((r) => r === reps[0]);
  const unit = e.sets[0]?.reps !== undefined ? '' : e.sets[0]?.holdS !== undefined ? ' s' : e.sets[0]?.carryM !== undefined ? ' m' : '';
  const load = topLoad(e);
  return `${same ? `${e.sets.length}×${reps[0]}` : reps.join('/')}${unit}${load ? ` @ ${load} kg` : ''}${rpeText(e, e.target ?? target)}`;
}

export function LogScreen({ ctx, preset }: { ctx: Ctx; preset: { date: string; session: SessionId; n: number } | null }) {
  const { data, today, backoff } = ctx;
  const { settings, workouts } = data;
  const defaultSession = (d: string): SessionId => dayPlan(d).legDay ?? (new Date().getHours() < 15 ? 'morning' : 'evening');
  const [date, setDate] = useState(preset?.date ?? today);
  const [session, setSession] = useState<SessionId>(preset?.session ?? defaultSession(today));
  const [entries, setEntries] = useState<EntryLog[]>([]);
  const [notes, setNotes] = useState('');
  const [existingId, setExistingId] = useState<number | undefined>();
  const [sessionPain, setSessionPain] = useState<number | undefined>();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [ownPain, setOwnPain] = useState<Set<string>>(new Set());
  const [toast, showToast] = useToast();
  const backingOff = backoff.active && date >= backoff.triggerDate! && date <= backoff.until!;

  useEffect(() => {
    if (preset) {
      setDate(preset.date);
      setSession(preset.session);
    }
  }, [preset]);

  const slots: Slot[] = useMemo(() => {
    if (ROUTINE(session)) return dayPlan(date)[session];
    return legDaySlots(session, settings.phase);
  }, [session, date, settings.phase]);

  const suggestionFor = (ex: Exercise, dose: Dose): Suggestion | null =>
    suggestLoad(history(workouts, ex.id, date), dose, settings.steps[ex.equipment], backingOff);

  // Load an existing workout for this date + session, or pre-fill the plan.
  useEffect(() => {
    const existing = workouts.find((w) => w.date === date && w.session === session);
    if (existing) {
      setEntries(existing.entries);
      setNotes(existing.notes ?? '');
      setExistingId(existing.id);
      setSessionPain(existing.pain);
      setCollapsed(new Set(existing.entries.map((e) => e.exerciseId)));
      setOwnPain(new Set(existing.entries.filter((e) => e.pain !== undefined && e.pain !== existing.pain).map((e) => e.exerciseId)));
      return;
    }
    const plan = dayPlan(date, backingOff);
    setEntries(
      slots.map((slot) => {
        const { exercise, dose } = resolveSlot(slot, settings);
        const target = ROUTINE(session) ? scaleDose(dose, plan.doseScale) : dose;
        const sug = suggestionFor(exercise, dose);
        return { exerciseId: exercise.id, slotRef: slot.ref, target, sets: setsFor(target, sug?.loadKg) };
      }),
    );
    setNotes('');
    setExistingId(undefined);
    setSessionPain(undefined);
    setCollapsed(new Set());
    setOwnPain(new Set());
    // Only re-run when the session identity changes, not on every data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, session, existingKey(workouts, date, session)]);

  const recent = [...workouts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0))).slice(0, 8);
  const toggleSet = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const n = new Set(set);
    if (n.has(key)) n.delete(key); else n.add(key);
    setter(n);
  };

  const patch = (i: number, p: Partial<EntryLog>) => setEntries((es) => es.map((e, k) => (k === i ? { ...e, ...p } : e)));
  // Editing a set also fills later sets that were blank or still matched it (type the weight once).
  const patchSet = (i: number, j: number, p: Partial<SetLog>) =>
    setEntries((es) =>
      es.map((e, k) => {
        if (k !== i) return e;
        const before = e.sets[j];
        return {
          ...e,
          sets: e.sets.map((s, m) => {
            if (m === j) return { ...s, ...p };
            if (m < j) return s;
            const follow = Object.fromEntries(
              Object.entries(p).filter(([key]) => s[key as keyof SetLog] === undefined || s[key as keyof SetLog] === before[key as keyof SetLog]),
            );
            return { ...s, ...follow };
          }),
        };
      }),
    );

  const save = async () => {
    // Session knee pain fills in for exercises without their own, so go-up hints work without extra taps.
    const filled = entries.map((e) => (ownPain.has(e.exerciseId) || sessionPain === undefined ? e : { ...e, pain: sessionPain }));
    setEntries(filled);
    const w: Workout = { date, session, entries: filled, notes: notes || undefined, pain: sessionPain };
    if (existingId) await db.workouts.put({ ...w, id: existingId });
    else setExistingId(await db.workouts.add(w));
    if (ROUTINE(session)) {
      const log = await getDaily(date);
      const items = { ...log.items };
      for (const e of filled) {
        if (!e.slotRef) continue;
        items[e.slotRef] = { ...items[e.slotRef], done: true, exerciseId: e.exerciseId, clean: e.clean ?? items[e.slotRef]?.clean };
      }
      await saveDaily({ ...log, items });
    }
    showToast('Saved');
  };

  const remove = async () => {
    if (!existingId || !confirm(`Delete the ${SESSION_NAMES[session]} log for ${formatDay(date)}?`)) return;
    await db.workouts.delete(existingId);
    setExistingId(undefined);
    showToast('Deleted');
  };

  return (
    <>
      <header className="screen-head">
        <h1>Log a workout</h1>
      </header>

      <section className="card log-head">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <fieldset className="seg">
          <legend>Session</legend>
          <div className="seg-row grid2">
            {(Object.keys(SESSION_NAMES) as SessionId[]).map((s) => (
              <button key={s} type="button" className={session === s ? 'on' : ''} aria-pressed={session === s} onClick={() => setSession(s)}>
                {SESSION_NAMES[s]}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="muted small">
          {existingId ? 'Editing a saved session.' : 'Pre-filled from the plan. Change what was different and remove what you skipped.'}
          {!ROUTINE(session) && ` ${settings.phase}-min version.`}
          {backingOff && ' Backing off: loads suggested at half.'}
        </p>
        <PainPicker label="Knee pain this session" value={sessionPain} onChange={setSessionPain} />
        <p className="small muted session-pain">Applies to every exercise. Set a different one on any exercise if needed.</p>
      </section>

      {entries.map((e, i) => (
        renderEntry(e, i)
      ))}

      <section className="card">
        <label className="field">
          <span>Add an exercise</span>
          <select
            value=""
            onChange={(ev) => {
              const ex = EX[ev.target.value];
              if (!ex) return;
              const sug = suggestionFor(ex, ex.dose);
              setEntries((es) => [...es, { exerciseId: ex.id, target: ex.dose, sets: setsFor(ex.dose, sug?.loadKg) }]);
            }}
          >
            <option value="">Choose…</option>
            {EXERCISES.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Session notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </section>

      {recent.length > 0 && (
        <section className="card">
          <h2>Recent sessions</h2>
          <ul className="plain history-list">
            {recent.map((w) => (
              <li key={w.id}>
                <button className="row-btn" onClick={() => { setDate(w.date); setSession(w.session); window.scrollTo(0, 0); }}>
                  <span className="row-name">{formatDay(w.date)} · {SESSION_NAMES[w.session]}</span>
                  <span className="row-dose">{w.entries.length} exercises{w.pain !== undefined ? ` · pain ${w.pain}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="save-bar">
        <RestButton />
        {existingId && <button className="btn danger" onClick={remove}>Delete</button>}
        <button className="btn primary wide" onClick={save} disabled={!entries.length}>
          {existingId ? 'Save changes' : `Save ${SESSION_NAMES[session]}`}
        </button>
      </div>
      <Toast text={toast} />
    </>
  );

  // Plain render function (not a component) so inputs keep focus while typing.
  function renderEntry(e: EntryLog, i: number) {
    const ex = EX[e.exerciseId] as Exercise | undefined;
    const target = e.target ?? ex?.dose;
    const last = history(workouts, e.exerciseId, date)[0];
    const sug = ex && target ? suggestionFor(ex, target) : null;
    const slot = slots.find((s) => s.ref === e.slotRef);
    const showLoad = (ex && LOADED.has(ex.equipment)) || e.sets.some((s) => s.loadKg !== undefined);
    const showReps = target?.reps !== undefined || e.sets.some((s) => s.reps !== undefined);
    const showHold = target?.holdS !== undefined || e.sets.some((s) => s.holdS !== undefined);
    const showCarry = target?.carryM !== undefined || e.sets.some((s) => s.carryM !== undefined);

    const k = e.exerciseId;
    if (collapsed.has(k)) {
      return (
        <section className="card entry collapsed" key={`${k}-${i}`}>
          <button className="entry-summary" onClick={() => toggleSet(collapsed, setCollapsed, k)} aria-expanded="false">
            <span className="done-tick" aria-hidden="true">✓</span>
            <span className="row-name"><strong>{exerciseName(e.exerciseId, e.name)}</strong></span>
            <span className="row-dose">{lastText(e, target)}</span>
          </button>
        </section>
      );
    }
    return (
      <section className="card entry" key={`${e.exerciseId}-${i}`}>
        <div className="entry-head">
          {slot?.pair && <span className="pair">{slot.pair}</span>}
          <button className="link entry-name" onClick={() => ex && ctx.openDetail(ex.id)}>
            {exerciseName(e.exerciseId, e.name)}
          </button>
          <button className="icon-btn small" aria-label={`Remove ${exerciseName(e.exerciseId, e.name)}`} onClick={() => setEntries((es) => es.filter((_, k) => k !== i))}>
            ✕
          </button>
        </div>
        <p className="small muted">
          {target && <>Plan {doseText(target)}</>}
          {last && <> · Last ({formatDay(last.date)}): {lastText(last.entry, target)}</>}
        </p>
        {sug && <p className={`hint h-${sug.hint}`}>{sug.message}</p>}

        <table className="sets">
          <thead>
            <tr>
              <th>Set</th>
              {showReps && <th>Reps</th>}
              {showLoad && <th>kg</th>}
              {showHold && <th>Hold s</th>}
              {showCarry && <th>Carry m</th>}
            </tr>
          </thead>
          <tbody>
            {e.sets.map((s, j) => (
              <tr key={j}>
                <td>{j + 1}</td>
                {showReps && <td><Num label={`Set ${j + 1} reps`} value={s.reps} onChange={(v) => patchSet(i, j, { reps: v })} /></td>}
                {showLoad && <td><Num label={`Set ${j + 1} kg`} value={s.loadKg} onChange={(v) => patchSet(i, j, { loadKg: v })} /></td>}
                {showHold && <td><Num label={`Set ${j + 1} hold seconds`} value={s.holdS} onChange={(v) => patchSet(i, j, { holdS: v })} /></td>}
                {showCarry && <td><Num label={`Set ${j + 1} carry metres`} value={s.carryM} onChange={(v) => patchSet(i, j, { carryM: v })} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="set-btns">
          <button className="btn ghost small" onClick={() => patch(i, { sets: [...e.sets, { ...e.sets[e.sets.length - 1] }] })}>+ set</button>
          {e.sets.length > 1 && <button className="btn ghost small" onClick={() => patch(i, { sets: e.sets.slice(0, -1) })}>− set</button>}
          {!showLoad && <button className="btn ghost small" onClick={() => patch(i, { sets: e.sets.map((s) => ({ ...s, loadKg: 0 })) })}>+ kg</button>}
        </div>

        {showReps && target && rpeText(e, target) && (
          <p className="small muted effort">Effort from your reps:{rpeText(e, target).replace(/^,/, '')}</p>
        )}
        {ownPain.has(k) ? (
          <PainPicker compact label="Knee pain for this exercise" value={e.pain} onChange={(v) => patch(i, { pain: v })} />
        ) : null}
        {ex?.ladder && (
          <label className="check-line">
            <input type="checkbox" checked={!!e.clean} onChange={(ev) => patch(i, { clean: ev.target.checked })} />
            <span>Clean: {LADDERS[ex.ladder].quality.toLowerCase()}</span>
          </label>
        )}
        <input className="note-input" placeholder="Notes" aria-label="Exercise notes" value={e.notes ?? ''} onChange={(ev) => patch(i, { notes: ev.target.value || undefined })} />
        <div className="entry-actions">
          <button className="btn ghost small" onClick={() => { toggleSet(ownPain, setOwnPain, k); if (ownPain.has(k)) patch(i, { pain: undefined }); }}>
            {ownPain.has(k) ? 'Use session pain' : 'Different knee pain?'}
          </button>
          <button className="btn primary small" onClick={() => toggleSet(collapsed, setCollapsed, k)}>Done ✓</button>
        </div>
      </section>
    );
  }
}

function existingKey(workouts: Workout[], date: string, session: SessionId) {
  return workouts.find((w) => w.date === date && w.session === session)?.id ?? 'new';
}
