import { useEffect, useRef } from 'react';
import { EX, LADDERS } from '../data/plan';
import { saveSettings } from '../db';
import { doseText } from '../logic/plan';
import { LEVEL_UP_STREAK } from '../logic/progression';
import type { LadderId, Settings } from '../types';
import { Illustration } from './Illustration';

export function DetailSheet({ exerciseId, settings, today, streaks, onClose }: { exerciseId: string; settings: Settings; today: string; streaks: Record<LadderId, number>; onClose: () => void }) {
  const ex = EX[exerciseId];
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  if (!ex) return null;
  const ladder = ex.ladder ? LADDERS[ex.ladder] : null;
  const current = ex.ladder ? settings.ladders[ex.ladder].level : 0;
  const setLevel = (id: LadderId, level: number) =>
    saveSettings({ ...settings, ladders: { ...settings.ladders, [id]: { level, since: today } } });

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="sheet-inner">
        <header className="sheet-head">
          <h2 id="sheet-title">{ex.name}</h2>
          <button className="icon-btn" aria-label="Close" onClick={() => ref.current?.close()}>
            ✕
          </button>
        </header>

        <p className="dose-big">{doseText(ex.dose)}</p>

        {ex.illustration && <Illustration id={ex.illustration} />}
        {!ex.illustration && ex.photos && (
          <figure className="photos">
            <div className="photo-pair">
              {ex.photos.map((p, i) => (
                <img key={p} src={p} alt={`${ex.name}, ${i === 0 ? 'start' : 'end'} position`} loading="lazy" />
              ))}
            </div>
            <figcaption>{ex.photoNote ?? 'Start and end position.'} Photos: free-exercise-db (public domain).</figcaption>
          </figure>
        )}

        <p className="howto">{ex.howTo}</p>

        <h3>Key cues</h3>
        <ul className="cues">
          {ex.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <h3>Most common mistake</h3>
        <p>{ex.mistake}</p>

        <h3>Why it's in the plan</h3>
        <p>{ex.why}</p>

        {ladder && (
          <>
            <h3>{ladder.name}</h3>
            <p className="muted">Move up when: {ladder.quality.charAt(0).toLowerCase() + ladder.quality.slice(1)}, {LEVEL_UP_STREAK} sessions in a row. Tick the clean question on Today (or in the log) and the app counts for you.</p>
            {current < ladder.levels.length && (
              <p>
                <span className="streak">{streaks[ladder.id]} of {LEVEL_UP_STREAK}</span> clean sessions in a row at level {current}.
              </p>
            )}
            <div className="ladder-ctl">
              {current < ladder.levels.length && (
                <button className="btn primary small" onClick={() => setLevel(ladder.id, current + 1)}>
                  Move up to level {current + 1} now
                </button>
              )}
              {current > 1 && (
                <button className="btn small" onClick={() => setLevel(ladder.id, current - 1)}>
                  Step back to level {current - 1}
                </button>
              )}
            </div>
            <p className="small muted">You can move up early if it feels easy, or step back if form breaks or the pain rule says back off. Changing level restarts the count.</p>
            <ol className="ladder-list">
              {ladder.levels.map((id, i) => (
                <li key={id} className={i + 1 === current ? 'current' : i + 1 < current ? 'past' : ''}>
                  <span>{EX[id].name}</span>
                  <span className="muted">{doseText(EX[id].dose)}</span>
                  {i + 1 === current && <span className="tag">you are here</span>}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </dialog>
  );
}
