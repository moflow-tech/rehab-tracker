import { useEffect, useRef, useState } from 'react';
import { buildSteps, clock, totalSeconds, type Step } from '../logic/timer';
import type { Dose, Exercise } from '../types';

// ---------- sound, vibration, screen wake ----------

let audio: AudioContext | null = null;
function beep(freq = 880, ms = 150) {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.2, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + ms / 1000);
  } catch {
    /* sound is optional */
  }
}
const buzz = (p: number | number[]) => navigator.vibrate?.(p);

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [active]);
}

/** A countdown that survives the phone throttling timers: it tracks an end time, not ticks. */
function useCountdown(running: boolean, onTick: (left: number) => void) {
  const cb = useRef(onTick);
  cb.current = onTick;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => cb.current(0), 200);
    return () => clearInterval(id);
  }, [running]);
}

const KIND_LABEL: Record<Step['kind'], string> = { ready: 'Get ready', hold: 'Hold', relax: 'Relax', rest: 'Rest', switch: 'Switch sides' };

export function TimerSheet({ exercise, dose, onDone, onClose }: { exercise: Exercise; dose: Dose; onDone?: () => void; onClose: () => void }) {
  const steps = useRef(buildSteps(dose)).current;
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  const [endAt, setEndAt] = useState(() => Date.now() + steps[0].secs * 1000);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const finished = i >= steps.length;
  const running = !finished && pausedLeft === null;
  useWakeLock(!finished);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  const go = (next: number) => {
    setI(next);
    if (next < steps.length) {
      setEndAt(Date.now() + steps[next].secs * 1000);
      const k = steps[next].kind;
      if (k === 'hold') { beep(990, 220); buzz(200); } else { beep(660, 180); buzz([80, 60, 80]); }
    } else {
      beep(990, 120); setTimeout(() => beep(1320, 300), 160); buzz([200, 100, 200]);
    }
  };

  const lastWhole = useRef(-1);
  useCountdown(running, () => {
    const t = Date.now();
    setNow(t);
    const left = (endAt - t) / 1000;
    const whole = Math.ceil(left);
    if (whole <= 3 && whole > 0 && whole !== lastWhole.current) beep(520, 60);
    lastWhole.current = whole;
    if (left <= 0) go(i + 1);
  });

  const step = steps[Math.min(i, steps.length - 1)];
  const left = pausedLeft ?? Math.max(0, (endAt - now) / 1000);
  const pct = finished ? 1 : 1 - left / step.secs;
  const doneSecs = steps.slice(0, i).reduce((a, s) => a + s.secs, 0) + (finished ? 0 : step.secs - left);
  const total = totalSeconds(steps);

  const pause = () => setPausedLeft(left);
  const resume = () => {
    setEndAt(Date.now() + (pausedLeft ?? 0) * 1000);
    setPausedLeft(null);
  };

  const sub = [
    `Set ${step.set} of ${step.sets}`,
    step.side,
    step.kind === 'hold' && step.rep ? `rep ${step.rep} of ${step.reps}` : undefined,
  ].filter(Boolean).join(' · ');

  return (
    <dialog ref={ref} className="sheet timer" aria-labelledby="timer-title" onClose={onClose}>
      <div className="sheet-inner">
        <header className="sheet-head">
          <h2 id="timer-title">{exercise.name}</h2>
          <button className="icon-btn" aria-label="Close timer" onClick={() => ref.current?.close()}>✕</button>
        </header>
        {finished ? (
          <div className="timer-done">
            <p className="timer-big">Done</p>
            <p className="muted">{clock(total)} total</p>
            {onDone && (
              <button className="btn primary wide" onClick={() => { onDone(); ref.current?.close(); }}>
                Mark as done ✓
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`timer-face k-${step.kind}`} aria-live="polite">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="52" className="ring-bg" />
                <circle cx="60" cy="60" r="52" className="ring" style={{ strokeDasharray: 326.7, strokeDashoffset: 326.7 * (1 - pct) }} />
              </svg>
              <div className="timer-center">
                <div className="timer-kind">{KIND_LABEL[step.kind]}</div>
                <div className="timer-big">{Math.ceil(left)}</div>
                <div className="timer-sub">{sub}</div>
              </div>
            </div>
            <div className="timer-bar" aria-hidden="true"><span style={{ width: `${(doneSecs / total) * 100}%` }} /></div>
            <p className="small muted center">{clock(total - doneSecs)} left in this exercise</p>
            <div className="timer-btns">
              <button className="btn" onClick={() => go(Math.max(0, i - 1))} disabled={i === 0}>Back</button>
              {running ? <button className="btn primary" onClick={pause}>Pause</button> : <button className="btn primary" onClick={resume}>Resume</button>}
              <button className="btn" onClick={() => go(i + 1)}>Skip</button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

/** Small rest timer for the gym log: tap to start, tap to stop. */
export function RestButton() {
  const options = [60, 90, 120];
  const [secs, setSecs] = useState(90);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  useCountdown(endAt !== null, () => {
    const t = Date.now();
    setNow(t);
    if (endAt && t >= endAt) {
      setEndAt(null);
      beep(990, 150); setTimeout(() => beep(1320, 300), 180); buzz([200, 100, 200]);
    }
  });
  if (endAt !== null) {
    return (
      <button className="btn rest on" onClick={() => setEndAt(null)} aria-label="Stop rest timer">
        Rest {clock((endAt - now) / 1000)} ✕
      </button>
    );
  }
  return (
    <span className="rest-group">
      <button className="btn rest" onClick={() => { setNow(Date.now()); setEndAt(Date.now() + secs * 1000); }}>Rest {secs}s</button>
      <button className="btn rest-cycle" aria-label="Change rest length" onClick={() => setSecs(options[(options.indexOf(secs) + 1) % options.length])}>⟳</button>
    </span>
  );
}
