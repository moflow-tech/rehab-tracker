import { useEffect, useState } from 'react';
import type { Ctx } from '../App';
import { Num, Toast, useToast } from '../components/ui';
import { TESTS } from '../data/plan';
import { db } from '../db';
import { addDays, formatDay, weekday } from '../logic/dates';
import { weeklySummary } from '../logic/summary';
import type { WeeklyTest } from '../types';

export function TestsScreen({ ctx }: { ctx: Ctx }) {
  const { data, today } = ctx;
  const lastSunday = addDays(today, -weekday(today));
  const [date, setDate] = useState(lastSunday);
  const [form, setForm] = useState<WeeklyTest>({ date });
  const [toast, showToast] = useToast();
  const tests = data.tests;
  const prev = [...tests].filter((t) => t.date < date).pop();

  useEffect(() => {
    setForm(tests.find((t) => t.date === date) ?? { date });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, tests.length]);

  const save = async () => {
    await db.tests.put({ ...form, date });
    showToast('Weekly tests saved');
  };

  const summary = weeklySummary(tests, data.workouts);

  return (
    <>
      <header className="screen-head">
        <h1>Weekly tests</h1>
        <p className="muted">Sunday retests against your 25 Nov baseline.</p>
      </header>

      <section className="card">
        <label className="field">
          <span>Test date</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <div className="test-grid">
          {TESTS.map((def) => {
            const p = prev?.[def.key];
            return (
              <div className="test-row" key={def.key}>
                <div>
                  <div className="test-label">{def.label}</div>
                  <div className="small muted">
                    Baseline {def.baselineText}
                    {p !== undefined && ` · last ${p}`} · target {def.targetText}
                  </div>
                </div>
                <div className="test-input">
                  <Num label={def.label} value={form[def.key]} onChange={(v) => setForm((f) => ({ ...f, [def.key]: v }))} />
                  <span className="unit">{def.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn primary wide" onClick={save}>Save tests</button>
      </section>

      {summary && (
        <section className="card summary">
          <h2>Week of {formatDay(summary.date)}</h2>
          <h3>Improved</h3>
          {summary.improved.length ? <ul>{summary.improved.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="muted">Nothing better than last time yet.</p>}
          <h3>Stalled for 3+ weeks</h3>
          {summary.stalled.length ? <ul>{summary.stalled.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="muted">Nothing stalled.</p>}
          <h3>Distance to target</h3>
          <table className="targets">
            <tbody>
              {summary.targets.map((t) => (
                <tr key={t.def.key} className={t.met ? 'met' : ''}>
                  <td>{t.def.label}</td>
                  <td className="num-cell">{t.current ?? '–'}</td>
                  <td className="small">{t.met ? '✓ target met' : t.gapText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tests.length > 0 && (
        <section className="card">
          <h2>History</h2>
          <div className="table-scroll">
            <table className="history">
              <thead>
                <tr>
                  <th>Date</th>
                  {TESTS.map((d) => <th key={d.key} title={d.label}>{shortLabel(d.key)}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...tests].reverse().map((t) => (
                  <tr key={t.date}>
                    <td><button className="link" onClick={() => setDate(t.date)}>{t.date.slice(5)}</button></td>
                    {TESTS.map((d) => <td key={d.key}>{t[d.key] ?? ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Toast text={toast} />
    </>
  );
}

function shortLabel(k: string) {
  return ({ walkingPain: 'Pain', ktwR: 'KtW R', ktwL: 'KtW L', balR: 'Bal R', balL: 'Bal L', heelRaiseR: 'HR R', heelRaiseL: 'HR L', heelWalkM: 'Heel walk', shortFootHolds: 'Short ft' } as Record<string, string>)[k];
}
