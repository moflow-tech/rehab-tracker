import { useMemo, useState } from 'react';
import { DetailSheet } from './components/DetailSheet';
import { EX, LADDERS } from './data/plan';
import { useData, type AllData } from './db';
import { todayISO } from './logic/dates';
import { backoffStatus, type BackoffStatus } from './logic/pain';
import { cleanStreak, ladderAttempts, ladderReady } from './logic/progression';
import { LogScreen } from './screens/Log';
import { MoreScreen } from './screens/More';
import { ProgressScreen } from './screens/Progress';
import { TestsScreen } from './screens/Tests';
import { TodayScreen } from './screens/Today';
import type { LadderId, SessionId } from './types';

export type Tab = 'today' | 'log' | 'tests' | 'progress' | 'more';

export interface Ctx {
  data: AllData;
  today: string;
  backoff: BackoffStatus;
  readyLadders: LadderId[];
  /** clean sessions in a row at the current level, per ladder (3 = ready) */
  ladderStreaks: Record<LadderId, number>;
  openDetail: (exerciseId: string) => void;
  goLog: (date: string, session: SessionId) => void;
  goTab: (t: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'M4 12l5 5L20 6' },
  { id: 'log', label: 'Log', icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'tests', label: 'Tests', icon: 'M6 20V10M12 20V4M18 20v-7' },
  { id: 'progress', label: 'Progress', icon: 'M3 17l6-6 4 4 8-8' },
  { id: 'more', label: 'More', icon: 'M5 12h.01M12 12h.01M19 12h.01' },
];

export default function App() {
  const data = useData();
  const [tab, setTab] = useState<Tab>('today');
  const [detail, setDetail] = useState<string | null>(null);
  const [logPreset, setLogPreset] = useState<{ date: string; session: SessionId; n: number } | null>(null);
  const today = todayISO();

  const derived = useMemo(() => {
    if (!data) return null;
    const backoff = backoffStatus(today, data.daily, data.workouts, data.tests, data.runs);
    const doses = Object.fromEntries(Object.values(EX).map((e) => [e.id, e.dose]));
    const ids = Object.keys(LADDERS) as LadderId[];
    const attempts = Object.fromEntries(ids.map((id) => [id, ladderAttempts(id, data.daily, data.workouts, doses)])) as Record<LadderId, ReturnType<typeof ladderAttempts>>;
    const readyLadders = ids.filter((id) => ladderReady(id, data.settings, attempts[id]));
    const ladderStreaks = Object.fromEntries(ids.map((id) => [id, cleanStreak(id, data.settings, attempts[id])])) as Record<LadderId, number>;
    return { backoff, readyLadders, ladderStreaks };
  }, [data, today]);

  if (!data || !derived) return <div className="loading">Loading…</div>;

  const ctx: Ctx = {
    data,
    today,
    ...derived,
    openDetail: setDetail,
    goLog: (date, session) => {
      setLogPreset((p) => ({ date, session, n: (p?.n ?? 0) + 1 }));
      setTab('log');
      window.scrollTo(0, 0);
    },
    goTab: (t) => {
      setTab(t);
      window.scrollTo(0, 0);
    },
  };

  return (
    <div className="app">
      <main className="main">
        {tab === 'today' && <TodayScreen ctx={ctx} />}
        {tab === 'log' && <LogScreen ctx={ctx} preset={logPreset} />}
        {tab === 'tests' && <TestsScreen ctx={ctx} />}
        {tab === 'progress' && <ProgressScreen ctx={ctx} />}
        {tab === 'more' && <MoreScreen ctx={ctx} />}
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => ctx.goTab(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {detail && <DetailSheet exerciseId={detail} settings={data.settings} today={today} streaks={derived.ladderStreaks} onClose={() => setDetail(null)} />}
    </div>
  );
}
