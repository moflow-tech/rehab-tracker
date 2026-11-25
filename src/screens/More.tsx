import { useState } from 'react';
import type { Ctx } from '../App';
import { Num, PainPicker, PainRuleCard, Toast, useToast } from '../components/ui';
import { EX, LADDERS, PHASE_SWITCH_DATE } from '../data/plan';
import { db, download, eraseAll, exportJSON, importJSON, mergeWorkouts, saveSettings } from '../db';
import { formatDay } from '../logic/dates';
import { csvToWorkouts, workoutsToCSV } from '../logic/csv';
import { runFlag } from '../logic/pain';
import type { Equipment, LadderId, Run } from '../types';

type Sub = 'runs' | 'settings' | 'about';

export function MoreScreen({ ctx }: { ctx: Ctx }) {
  const [sub, setSub] = useState<Sub>('runs');
  return (
    <>
      <header className="screen-head">
        <h1>More</h1>
        <div className="seg-row tabs-sub" role="tablist">
          {(['runs', 'settings', 'about'] as Sub[]).map((s) => (
            <button key={s} role="tab" aria-selected={sub === s} className={sub === s ? 'on' : ''} onClick={() => setSub(s)}>
              {s === 'runs' ? 'Runs' : s === 'settings' ? 'Settings & backup' : 'About'}
            </button>
          ))}
        </div>
      </header>
      {sub === 'runs' && <Runs ctx={ctx} />}
      {sub === 'settings' && <SettingsPane ctx={ctx} />}
      {sub === 'about' && <About />}
    </>
  );
}

function Runs({ ctx }: { ctx: Ctx }) {
  const { data, today } = ctx;
  const blank: Run = { date: today };
  const [form, setForm] = useState<Run>(blank);
  const [toast, showToast] = useToast();
  const runs = [...data.runs].sort((a, b) => (a.date < b.date ? 1 : -1));

  const save = async () => {
    await db.runs.put(form);
    setForm(blank);
    showToast('Run saved');
  };

  return (
    <>
      <section className="card">
        <h2>{form.id ? 'Edit run' : 'Log a walk–run'}</h2>
        <p className="small muted">OK when pain during is 5/10 or less and pain the next morning is 2/10 or less.</p>
        <label className="field">
          <span>Date</span>
          <input type="date" value={form.date} max={today} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label className="field">
          <span>Session</span>
          <input placeholder="e.g. 6 × (1 min run / 2 min walk)" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value || undefined })} />
        </label>
        <label className="field inline">
          <span>Minutes</span>
          <Num label="Minutes" value={form.minutes} onChange={(v) => setForm({ ...form, minutes: v })} />
        </label>
        <PainPicker label="Pain during" value={form.painDuring} onChange={(v) => setForm({ ...form, painDuring: v })} />
        <PainPicker label="Pain next morning" value={form.painNextMorning} onChange={(v) => setForm({ ...form, painNextMorning: v })} />
        <label className="field">
          <span>Notes</span>
          <input value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })} />
        </label>
        <div className="save-row">
          {form.id && <button className="btn" onClick={() => setForm(blank)}>Cancel</button>}
          <button className="btn primary wide" onClick={save}>Save run</button>
        </div>
      </section>

      {runs.length > 0 && (
        <section className="card">
          <h2>Runs</h2>
          <ul className="plain runs">
            {runs.map((r) => {
              const flag = runFlag(r);
              return (
                <li key={r.id}>
                  <button className="row-btn" onClick={() => setForm(r)}>
                    <span className="row-name">
                      {formatDay(r.date)}
                      {r.description && <span className="muted small"> · {r.description}</span>}
                    </span>
                    <span className={`flag f-${flag.replace(' ', '').toLowerCase()}`}>
                      {flag === 'OK' ? '✓ OK' : flag === 'Back off' ? '! Back off' : '… add next morning'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Toast text={toast} />
    </>
  );
}

const EQUIP_LABEL: Partial<Record<Equipment, string>> = { barbell: 'Barbell', machine: 'Machine', dumbbell: 'Dumbbell', cable: 'Cable' };

function SettingsPane({ ctx }: { ctx: Ctx }) {
  const { settings, workouts } = ctx.data;
  const [toast, showToast] = useToast();
  const stamp = ctx.today;

  const pickFile = (accept: string, onText: (t: string) => Promise<void>) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        await onText(await f.text());
      } catch (e) {
        alert((e as Error).message);
      }
    };
    input.click();
  };

  return (
    <>
      <section className="card">
        <h2>Leg-day version</h2>
        <fieldset className="seg">
          <legend className="sr-only">Leg-day version</legend>
          <div className="seg-row">
            {(['20', '45'] as const).map((p) => (
              <button key={p} className={settings.phase === p ? 'on' : ''} aria-pressed={settings.phase === p} onClick={() => saveSettings({ ...settings, phase: p })}>
                {p}-min
              </button>
            ))}
          </div>
        </fieldset>
        <p className="small muted">
          The app suggests switching on {formatDay(PHASE_SWITCH_DATE)}.
          {settings.phaseDelayUntil && ` Delayed until ${formatDay(settings.phaseDelayUntil)}.`}
        </p>
      </section>

      <section className="card">
        <h2>Weight steps</h2>
        <p className="small muted">The smallest jump you can make, used to round load suggestions.</p>
        {(Object.keys(EQUIP_LABEL) as Equipment[]).map((k) => (
          <label className="field inline" key={k}>
            <span>{EQUIP_LABEL[k]}</span>
            <span className="test-input">
              <Num label={`${EQUIP_LABEL[k]} step`} value={settings.steps[k]} onChange={(v) => v && v > 0 && saveSettings({ ...settings, steps: { ...settings.steps, [k]: v } })} />
              <span className="unit">kg</span>
            </span>
          </label>
        ))}
      </section>

      <section className="card">
        <h2>Ladder levels</h2>
        <p className="small muted">Set these by hand if you need to step back.</p>
        {(Object.keys(LADDERS) as LadderId[]).map((id) => (
          <label className="field" key={id}>
            <span>{LADDERS[id].name}</span>
            <select
              value={settings.ladders[id].level}
              onChange={(e) => saveSettings({ ...settings, ladders: { ...settings.ladders, [id]: { level: Number(e.target.value), since: ctx.today } } })}
            >
              {LADDERS[id].levels.map((ex, i) => (
                <option key={ex} value={i + 1}>
                  {i + 1}. {EX[ex].name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </section>

      <section className="card">
        <h2>Backup</h2>
        <p className="small muted">Your data lives only in this browser. Export a backup every week or two and keep it somewhere safe.</p>
        <div className="btn-grid">
          <button className="btn primary" onClick={async () => { download(`rehab-backup-${stamp}.json`, await exportJSON(), 'application/json'); await saveSettings({ ...settings, lastBackup: stamp }); }}>Export backup (JSON)</button>
          <button
            className="btn"
            onClick={() =>
              pickFile('.json,application/json', async (t) => {
                if (!confirm('Restoring replaces everything in the app with the backup. Continue?')) return;
                await importJSON(t);
                showToast('Backup restored');
              })
            }
          >
            Restore backup
          </button>
          <button className="btn" onClick={() => download(`rehab-workouts-${stamp}.csv`, workoutsToCSV(workouts), 'text/csv')}>Export workouts (CSV)</button>
          <button
            className="btn"
            onClick={() =>
              pickFile('.csv,text/csv', async (t) => {
                const { workouts: incoming, skipped } = csvToWorkouts(t);
                const res = await mergeWorkouts(incoming);
                alert(`Imported ${res.added} exercise entries.${res.skipped ? ` Skipped ${res.skipped} already logged.` : ''}${skipped.length ? `\n\nCouldn't read:\n${skipped.slice(0, 10).join('\n')}` : ''}`);
              })
            }
          >
            Import workouts (CSV)
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Erase data</h2>
        <button
          className="btn danger"
          onClick={async () => {
            if (!confirm('Erase all logs, tests, runs and settings from this browser? This cannot be undone.')) return;
            if (!confirm('Really erase everything? Export a backup first if unsure.')) return;
            await eraseAll();
            showToast('All data erased');
          }}
        >
          Erase everything
        </button>
      </section>
      <Toast text={toast} />
    </>
  );
}

function About() {
  return (
    <>
      <PainRuleCard />
      <section className="card about">
        <h2>About</h2>
        <p>A personal tracker for your rehab and leg-day plan. It is not medical software and doesn't diagnose or advise beyond the plan you entered.</p>
        <h3>Credits</h3>
        <ul>
          <li>Gym exercise photos: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">free-exercise-db</a> by yuhonas (Unlicense, public domain).</li>
          <li>Routine illustrations: original drawings made for this app.</li>
          <li>Typeface: Atkinson Hyperlegible by the Braille Institute (SIL Open Font License).</li>
          <li>Built with React, Dexie, Recharts and vite-plugin-pwa (MIT / Apache-2.0).</li>
        </ul>
      </section>
    </>
  );
}
