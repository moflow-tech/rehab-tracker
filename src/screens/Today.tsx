import { useState } from 'react';
import type { Ctx } from '../App';
import { TimerSheet } from '../components/Timer';
import { Banner, PainPicker, PainRuleCard } from '../components/ui';
import { EX, LADDERS, SESSION_NAMES } from '../data/plan';
import { download, exportJSON, patchDaily, saveSettings } from '../db';
import { addDays, daysBetween, formatDay, fromISO, weekday } from '../logic/dates';
import { dayPlan, doseText, dueRoutines, legDaySlots, phasePrompt, resolveSlot, scaleDose, slotsDone } from '../logic/plan';
import { isTimed } from '../logic/timer';
import type { DailyLog, Dose, Exercise, LadderId, RoutineId, Slot, Swelling } from '../types';

const ROUTINE_TITLE: Record<RoutineId, [string, string]> = {
  morning: ['Morning routine', 'ankle and foot · about 10 min'],
  evening: ['Evening routine', 'mobility and balance · about 10 min'],
  finisher: ['Lower-body finisher', 'after your upper-body session · about 6 min'],
};

const SWELLING: Swelling[] = ['None', 'Mild', 'Moderate', 'Marked'];

export function TodayScreen({ ctx }: { ctx: Ctx }) {
  const { data, today, backoff, readyLadders } = ctx;
  const [date, setDate] = useState(today);
  const [timer, setTimer] = useState<{ slot: Slot; exercise: Exercise; dose: Dose } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { settings } = data;
  const isToday = date === today;
  const plan = dayPlan(date, isToday && backoff.active);
  const log: DailyLog = data.daily.find((d) => d.date === date) ?? { date, items: {} };
  const update = (patch: Partial<DailyLog>) => patchDaily(date, (l) => ({ ...l, ...patch }));
  const setItem = (slot: Slot, change: (cur: DailyLog['items'][string] | undefined) => Partial<DailyLog['items'][string]>) =>
    patchDaily(date, (l) => ({ ...l, items: { ...l.items, [slot.ref]: { ...(l.items[slot.ref] ?? { done: false }), ...change(l.items[slot.ref]) } } }));

  const exId = (slot: Slot) => resolveSlot(slot, settings).exercise.id;
  const toggle = (slot: Slot) => setItem(slot, (cur) => ({ done: !cur?.done, exerciseId: exId(slot) }));
  const setClean = (slot: Slot, clean: boolean) => setItem(slot, () => ({ done: true, clean }));
  const markDone = (slot: Slot) => setItem(slot, () => ({ done: true, exerciseId: exId(slot) }));
  const markAll = (slots: Slot[], done: boolean) =>
    patchDaily(date, (l) => {
      const items = { ...l.items };
      for (const s of slots) items[s.ref] = { ...items[s.ref], done, exerciseId: exId(s) };
      return { ...l, items };
    });

  const levelUp = (id: LadderId) =>
    saveSettings({ ...settings, ladders: { ...settings.ladders, [id]: { level: settings.ladders[id].level + 1, since: today } } });
  const notYet = (id: LadderId) =>
    saveSettings({ ...settings, ladders: { ...settings.ladders, [id]: { ...settings.ladders[id], since: addDays(today, 1) } } });

  const legWorkout = plan.legDay && data.workouts.find((w) => w.date === date && w.session === plan.legDay);

  // ---------- first run & backup reminder ----------
  const hasData = data.daily.length + data.workouts.length + data.tests.length + data.runs.length > 0;
  const firstDate = [...data.daily, ...data.workouts, ...data.tests].map((x) => x.date).sort()[0];
  const backupDue =
    hasData && !!firstDate && daysBetween(firstDate, today) >= 7 && (!settings.lastBackup || daysBetween(settings.lastBackup, today) >= 14);
  const backupNow = async () => {
    download(`rehab-backup-${today}.json`, await exportJSON(), 'application/json');
    await saveSettings({ ...settings, lastBackup: today });
  };

  // ---------- week strip (Mon–Sun around the selected day) ----------
  const monday = addDays(date, -((weekday(date) + 6) % 7));
  const week = Array.from({ length: 7 }, (_, k) => addDays(monday, k));

  return (
    <>
      <header className="screen-head day-nav">
        <button className="icon-btn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <div>
          <h1>{isToday ? 'Today' : formatDay(date)}</h1>
          <p className="muted">{isToday ? formatDay(date) : <button className="link" onClick={() => setDate(today)}>Back to today</button>}</p>
        </div>
        <button className="icon-btn" aria-label="Next day" onClick={() => setDate(addDays(date, 1))} disabled={isToday}>›</button>
      </header>

      <nav className="week" aria-label="This week">
        {week.map((d) => {
          const p = dayPlan(d);
          const l = data.daily.find((x) => x.date === d);
          const marks = [
            ...dueRoutines(p).map((r) => ({ k: SESSION_NAMES[r], done: slotsDone(p[r], l), leg: false })),
            ...(p.legDay ? [{ k: SESSION_NAMES[p.legDay], done: data.workouts.some((w) => w.date === d && w.session === p.legDay), leg: true }] : []),
          ];
          const future = d > today;
          return (
            <button
              key={d}
              className={`wk ${d === date ? 'sel' : ''} ${d === today ? 'today' : ''}`}
              disabled={future}
              onClick={() => setDate(d)}
              aria-label={`${formatDay(d)}: ${marks.map((m) => `${m.k} ${m.done ? 'done' : 'not done'}`).join(', ')}`}
            >
              <span className="wk-day">{fromISO(d).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
              <span className="wk-num">{fromISO(d).getDate()}</span>
              <span className="wk-dots" aria-hidden="true">
                {marks.map((m, k) => <i key={k} className={`${m.done ? 'on' : ''} ${m.leg ? 'leg' : ''}`} />)}
              </span>
            </button>
          );
        })}
      </nav>

      {!hasData && !settings.welcomeDone && (
        <Banner tone="info" title="Welcome – here's how it works" actions={<button className="btn primary" onClick={() => saveSettings({ ...settings, welcomeDone: true })}>Got it</button>}>
          <ul className="welcome">
            <li>Tick each exercise as you do it. Tap a name for how-to and pictures; ▶ runs a guided timer for holds.</li>
            <li>On leg days, log weights in the Log tab. The app suggests your next weights and when to move up a level.</li>
            <li>Fill in the check-in every day and the tests on Sundays. Your data stays on this phone – export a backup now and then.</li>
          </ul>
        </Banner>
      )}

      {isToday && backupDue && (
        <Banner tone="info" title="Time to back up" actions={<button className="btn primary" onClick={backupNow}>Export backup</button>}>
          Your data only lives on this phone. {settings.lastBackup ? `Last backup ${formatDay(settings.lastBackup)}.` : 'You haven\'t made a backup yet.'}
        </Banner>
      )}

      {isToday && backoff.active && (
        <Banner tone="stop" title={`Back off until ${formatDay(backoff.until!)}`}>
          {backoff.reason}. Routine doses are halved and leg-day loads are suggested at half.
        </Banner>
      )}

      {isToday && phasePrompt(today, settings) && (
        <Banner
          tone="info"
          title="Time for the 45-min leg days?"
          actions={
            <>
              <button className="btn primary" onClick={() => saveSettings({ ...settings, phase: '45', phaseDelayUntil: undefined })}>Switch now</button>
              <button className="btn" onClick={() => saveSettings({ ...settings, phaseDelayUntil: addDays(today, 7) })}>Delay a week</button>
            </>
          }
        >
          The plan moves to the longer sessions from week 3. Switch once walking pain has stayed at 2/10 or less for 30 min.
        </Banner>
      )}

      {isToday &&
        readyLadders.map((id) => {
          const next = EX[LADDERS[id].levels[settings.ladders[id].level]];
          return (
            <Banner
              key={id}
              tone="go"
              title={`${LADDERS[id].name}: ready for level ${settings.ladders[id].level + 1}`}
              actions={
                <>
                  <button className="btn primary" onClick={() => levelUp(id)}>Move up</button>
                  <button className="btn" onClick={() => notYet(id)}>Not yet</button>
                </>
              }
            >
              3 clean sessions in a row. Next: <button className="link" onClick={() => ctx.openDetail(next.id)}>{next.name}</button> ({doseText(next.dose)}).
            </Banner>
          );
        })}

      {plan.isSunday && (
        <Banner tone="info" title="Sunday: rest morning, easy evening and weekly tests" actions={<button className="btn primary" onClick={() => ctx.goTab('tests')}>Do the tests</button>} />
      )}

      {plan.legDay && (
        <section className="card legday">
          <div className="section-head">
            <h2>{SESSION_NAMES[plan.legDay]}</h2>
            <span className="muted">{settings.phase}-min version</span>
          </div>
          <ul className="plain">
            {legDaySlots(plan.legDay, settings.phase).map((s, i) => {
              const { exercise, dose } = resolveSlot(s, settings);
              return (
                <li key={i}>
                  <button className="row-btn" onClick={() => ctx.openDetail(exercise.id)}>
                    {s.pair && <span className="pair">{s.pair}</span>}
                    <span className="row-name">{exercise.name}</span>
                    <span className="row-dose">{doseText(dose)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="btn primary wide" onClick={() => ctx.goLog(date, plan.legDay!)}>
            {legWorkout ? 'Logged ✓ – view or edit' : `Log ${SESSION_NAMES[plan.legDay]}`}
          </button>
        </section>
      )}

      {dueRoutines(plan).map((r) => routine(ROUTINE_TITLE[r][0], ROUTINE_TITLE[r][1], plan[r], r))}

      <section className="card">
        <h2>Check-in</h2>
        <PainPicker label="Walking knee pain" value={log.walkingPain} onChange={(v) => update({ walkingPain: v })} />
        <PainPicker label="Knee pain on waking this morning" value={log.morningPain} onChange={(v) => update({ morningPain: v })} />
        <fieldset className="seg">
          <legend>Ankle swelling</legend>
          <div className="seg-row">
            {SWELLING.map((s) => (
              <button key={s} type="button" aria-pressed={log.swelling === s} className={log.swelling === s ? 'on' : ''} onClick={() => update({ swelling: log.swelling === s ? undefined : s })}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>Notes</span>
          <textarea key={date} defaultValue={log.notes} rows={2} onBlur={(e) => e.target.value !== (log.notes ?? '') && update({ notes: e.target.value || undefined })} />
        </label>
      </section>

      <PainRuleCard />
      {timer && (
        <TimerSheet exercise={timer.exercise} dose={timer.dose} onDone={() => markDone(timer.slot)} onClose={() => setTimer(null)} />
      )}
    </>
  );

  function routine(title: string, note: string, slots: Slot[], session: RoutineId) {
    const done = slots.filter((s) => log.items[s.ref]?.done).length;
    const all = done === slots.length;
    const key = `${date}-${session}`;
    // Collapse a finished routine once every ladder question is answered.
    const answered = slots.every((s) => !s.ladder || log.items[s.ref]?.clean !== undefined);
    if (all && answered && !open[key]) {
      return (
        <section className="card done-card" key={session}>
          <button className="done-summary" onClick={() => setOpen({ ...open, [key]: true })} aria-expanded="false">
            <span className="done-tick" aria-hidden="true">✓</span>
            <span className="row-name"><strong>{title}</strong> done</span>
            <span className="muted small">Show</span>
          </button>
        </section>
      );
    }
    return (
      <section className="card" key={session}>
        <div className="section-head">
          <h2>{title}</h2>
          <span className={`count ${all ? 'complete' : ''}`}>{done}/{slots.length}</span>
        </div>
        <p className="muted small">
          {note}
          {plan.doseScale < 1 && ' · half doses today'}
        </p>
        <ul className="checklist">
          {slots.map((s) => {
            const { exercise, dose } = resolveSlot(s, settings);
            const item = log.items[s.ref];
            const ladder = s.ladder ? LADDERS[s.ref as LadderId] : null;
            return (
              <li key={s.ref} className={item?.done ? 'done' : ''}>
                <label className="check">
                  <input type="checkbox" checked={!!item?.done} onChange={() => toggle(s)} />
                  <span className="box" aria-hidden="true" />
                  <span className="sr-only">Done: {exercise.name}</span>
                </label>
                <button className="row-btn" onClick={() => ctx.openDetail(exercise.id)}>
                  <span className="row-name">
                    {exercise.name}
                    {ladder && (
                      <span className="tag">
                        L{settings.ladders[ladder.id].level}
                        {settings.ladders[ladder.id].level < ladder.levels.length && ` · ${ctx.ladderStreaks[ladder.id]}/3`}
                      </span>
                    )}
                  </span>
                  <span className="row-dose">{doseText(scaleDose(dose, plan.doseScale))}</span>
                </button>
                {isTimed(dose) ? (
                  <button
                    className="play"
                    aria-label={`Start timer for ${exercise.name}`}
                    onClick={() => setTimer({ slot: s, exercise, dose: scaleDose(dose, plan.doseScale) })}
                  >
                    ▶
                  </button>
                ) : (
                  <span />
                )}
                {ladder && item?.done && (
                  <div className="clean-row">
                    <span className="small muted">{ladder.quality}?</span>
                    <span className="chips">
                      <button className={`chip ${item.clean === true ? 'on' : ''}`} aria-pressed={item.clean === true} onClick={() => setClean(s, true)}>
                        Yes
                      </button>
                      <button className={`chip no ${item.clean === false ? 'on' : ''}`} aria-pressed={item.clean === false} onClick={() => setClean(s, false)}>
                        No
                      </button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="routine-actions">
          <button className="btn ghost small" onClick={() => markAll(slots, !all)}>
            {all ? 'Clear all' : 'Mark all done'}
          </button>
          <button className="btn ghost small" onClick={() => ctx.goLog(date, session)}>
            {data.workouts.some((w) => w.date === date && w.session === session) ? 'Edit details ✓' : 'Log reps & holds'}
          </button>
        </div>
      </section>
    );
  }
}
