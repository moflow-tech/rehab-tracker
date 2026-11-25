import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Ctx } from '../App';
import { BASELINE_DATE, EX, LADDERS, TESTS, exerciseName } from '../data/plan';
import { addDays, fromISO, weekday } from '../logic/dates';
import { bestE1RM, topLoad } from '../logic/progression';
import { completion7, streak } from '../logic/summary';
import type { LadderId, WeeklyTest } from '../types';

const baselineTest: WeeklyTest = Object.fromEntries([
  ['date', BASELINE_DATE],
  ...TESTS.filter((t) => t.baseline !== undefined).map((t) => [t.key, t.baseline]),
]) as WeeklyTest;

const weekStart = (d: string) => addDays(d, -((weekday(d) + 6) % 7)); // Monday
const short = (d: string) => fromISO(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const round1 = (x: number) => Math.round(x * 10) / 10;

export function ProgressScreen({ ctx }: { ctx: Ctx }) {
  const { data, today } = ctx;
  const { daily, tests, workouts, settings } = data;
  const allTests = useMemo(() => [baselineTest, ...tests].sort((a, b) => (a.date < b.date ? -1 : 1)), [tests]);

  // ---------- headline numbers ----------
  const painPoints = [
    ...daily.filter((d) => d.walkingPain !== undefined).map((d) => ({ date: d.date, v: d.walkingPain! })),
    ...allTests.filter((t) => t.walkingPain !== undefined).map((t) => ({ date: t.date, v: t.walkingPain! })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latestPain = painPoints[painPoints.length - 1]?.v;
  const lastWith = (k: keyof WeeklyTest) => [...allTests].reverse().find((t) => t[k] !== undefined)?.[k] as number | undefined;
  const ktwR = lastWith('ktwR');
  const ktwL = lastWith('ktwL');
  const gap = ktwR !== undefined && ktwL !== undefined ? ktwL - ktwR : undefined;
  const comp = Math.round(completion7(today, daily) * 100);
  const strk = streak(today, daily);

  // ---------- weekly series ----------
  const painWeekly = useMemo(() => {
    const m = new Map<string, { week: string; test?: number; sum: number; n: number }>();
    const row = (w: string) => m.get(w) ?? m.set(w, { week: w, sum: 0, n: 0 }).get(w)!;
    for (const d of daily) if (d.walkingPain !== undefined) { const r = row(weekStart(d.date)); r.sum += d.walkingPain; r.n++; }
    for (const t of allTests) if (t.walkingPain !== undefined) row(weekStart(t.date)).test = t.walkingPain;
    return [...m.values()]
      .sort((a, b) => (a.week < b.week ? -1 : 1))
      .map((r) => ({ week: short(r.week), 'Weekly test': r.test, 'Daily average': r.n ? round1(r.sum / r.n) : undefined }));
  }, [daily, allTests]);

  const rl = (kR: keyof WeeklyTest, kL: keyof WeeklyTest) =>
    allTests.filter((t) => t[kR] !== undefined || t[kL] !== undefined).map((t) => ({ week: short(t.date), Right: t[kR], Left: t[kL] }));

  // ---------- per-exercise ----------
  const loggedIds = useMemo(() => {
    const s = new Set<string>();
    workouts.forEach((w) => w.entries.forEach((e) => s.add(e.exerciseId)));
    return [...s].sort((a, b) => exerciseName(a).localeCompare(exerciseName(b)));
  }, [workouts]);
  const [exId, setExId] = useState<string>('');
  const chosen = exId && loggedIds.includes(exId) ? exId : loggedIds.find((id) => EX[id] && ['machine', 'barbell', 'dumbbell'].includes(EX[id].equipment)) ?? loggedIds[0];

  const exSeries = useMemo(() => {
    if (!chosen) return { rows: [], loaded: false, unit: '' };
    const rows: Record<string, string | number | undefined>[] = [];
    let loaded = false;
    let unit = 'reps';
    for (const w of [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1))) {
      for (const e of w.entries) {
        if (e.exerciseId !== chosen) continue;
        const load = topLoad(e);
        if (load > 0) {
          loaded = true;
          const e1 = bestE1RM(e);
          rows.push({ date: short(w.date), 'Top load': load, 'Est. 1RM': e1 ? round1(e1) : undefined });
        } else {
          const holds = e.sets.map((s) => s.holdS ?? 0);
          const carry = e.sets.map((s) => s.carryM ?? 0);
          if (Math.max(...holds) > 0) { unit = 's'; rows.push({ date: short(w.date), 'Longest hold': Math.max(...holds) }); }
          else if (Math.max(...carry) > 0) { unit = 'm'; rows.push({ date: short(w.date), 'Total carry': carry.reduce((a, b) => a + b, 0) }); }
          else rows.push({ date: short(w.date), 'Total reps': e.sets.reduce((a, s) => a + (s.reps ?? 0), 0) });
        }
      }
    }
    return { rows, loaded, unit };
  }, [chosen, workouts]);

  return (
    <>
      <header className="screen-head">
        <h1>Progress</h1>
      </header>

      <section className="tiles">
        <Tile label="Walking knee pain" value={latestPain ?? '–'} unit="/10" note="target ≤ 1" />
        <Tile label="Knee-to-wall R" value={ktwR ?? '–'} unit="cm" note="target ≥ 12" />
        <Tile label="Gap L − R" value={gap ?? '–'} unit="cm" note="target ≤ 2" />
        <Tile label="Routines, last 7 days" value={comp} unit="%" note={strk ? `${strk}-day streak` : 'no streak yet'} />
      </section>

      <ChartCard title="Knee pain by week" desc="Walking knee pain, 0–10. Lower is better.">
        <LineChart data={painWeekly} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickLine={false} />
          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tickLine={false} axisLine={false} />
          <ReferenceLine y={1} strokeDasharray="4 4" className="ref" label={{ value: 'target', position: 'insideTopRight', className: 'ref-label' }} />
          <Tooltip />
          <Legend />
          <Line isAnimationActive={false} dataKey="Weekly test" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
          <Line isAnimationActive={false} dataKey="Daily average" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
        </LineChart>
      </ChartCard>

      <ChartCard title="Knee-to-wall, right vs left" desc="cm. Goal: right ≥ 12 and within 2 cm of left.">
        <LineChart data={rl('ktwR', 'ktwL')} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickLine={false} />
          <YAxis domain={[0, 'dataMax + 2']} tickLine={false} axisLine={false} allowDecimals={false} />
          <ReferenceLine y={12} strokeDasharray="4 4" className="ref" label={{ value: 'R target', position: 'insideBottomRight', className: 'ref-label' }} />
          <Tooltip />
          <Legend />
          <Line isAnimationActive={false} dataKey="Right" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
          <Line isAnimationActive={false} dataKey="Left" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
        </LineChart>
      </ChartCard>

      <ChartCard title="Eyes-closed balance, right vs left" desc="Seconds. Target 30 s each side.">
        <LineChart data={rl('balR', 'balL')} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="week" tickLine={false} />
          <YAxis domain={[0, 35]} ticks={[0, 10, 20, 30]} tickLine={false} axisLine={false} />
          <ReferenceLine y={30} strokeDasharray="4 4" className="ref" label={{ value: 'target', position: 'insideTopRight', className: 'ref-label' }} />
          <Tooltip />
          <Legend />
          <Line isAnimationActive={false} dataKey="Right" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
          <Line isAnimationActive={false} dataKey="Left" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
        </LineChart>
      </ChartCard>

      <section className="card">
        <h2>Exercise progress</h2>
        {loggedIds.length === 0 ? (
          <p className="muted">Log a workout to see progress per exercise.</p>
        ) : (
          <>
            <label className="field">
              <span>Exercise</span>
              <select value={chosen} onChange={(e) => setExId(e.target.value)}>
                {loggedIds.map((id) => (
                  <option key={id} value={id}>{exerciseName(id)}</option>
                ))}
              </select>
            </label>
            <p className="small muted">
              {exSeries.loaded ? 'kg. Estimated 1RM uses Epley, load × (1 + reps/30), for sets of 12 reps or fewer.' : `Bodyweight: ${exSeries.unit === 's' ? 'longest hold (s)' : exSeries.unit === 'm' ? 'total carry (m)' : 'total reps'}.`}
            </p>
            <div className="chart">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={exSeries.rows} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip />
                  {exSeries.loaded ? (
                    <>
                      <Legend />
                      <Line isAnimationActive={false} dataKey="Top load" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line isAnimationActive={false} dataKey="Est. 1RM" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    </>
                  ) : (
                    <Line isAnimationActive={false} dataKey={Object.keys(exSeries.rows[0] ?? {}).find((k) => k !== 'date') ?? 'Total reps'} stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4 }} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2>Progression ladders</h2>
        {(Object.keys(LADDERS) as LadderId[]).map((id) => {
          const l = LADDERS[id];
          const lvl = settings.ladders[id].level;
          return (
            <div className="ladder" key={id}>
              <div className="section-head">
                <strong>{l.name}</strong>
                <span className="muted small">level {lvl} of {l.levels.length}</span>
              </div>
              <div className="steps" role="img" aria-label={`${l.name}: level ${lvl} of ${l.levels.length}`}>
                {l.levels.map((exId, i) => (
                  <button key={exId} className={`step ${i + 1 < lvl ? 'past' : i + 1 === lvl ? 'current' : ''}`} onClick={() => ctx.openDetail(exId)} title={EX[exId].name}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <p className="small muted">{EX[l.levels[lvl - 1]].name}</p>
            </div>
          );
        })}
      </section>
    </>
  );
}

function Tile({ label, value, unit, note }: { label: string; value: number | string; unit: string; note: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">
        {value}
        <span className="tile-unit">{unit}</span>
      </div>
      <div className="tile-note">{note}</div>
    </div>
  );
}

function ChartCard({ title, desc, children }: { title: string; desc: string; children: React.ReactElement }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="small muted">{desc}</p>
      <div className="chart">
        <ResponsiveContainer width="100%" height={220}>
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
