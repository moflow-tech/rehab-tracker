import { useEffect, useState, type ReactNode } from 'react';
import { painZone } from '../logic/pain';

export function PainPicker({ value, onChange, label, compact }: { value?: number; onChange: (v?: number) => void; label: string; compact?: boolean }) {
  return (
    <fieldset className={`pain ${compact ? 'compact' : ''}`}>
      <legend>{label}</legend>
      <div className="pain-row" role="radiogroup" aria-label={label}>
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            className={`pain-chip z-${painZone(i)} ${value === i ? 'on' : ''}`}
            onClick={() => onChange(value === i ? undefined : i)}
          >
            {i}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Numeric input that keeps its own text while typing (so "2." or "" work) and reports numbers. */
export function Num({ value, onChange, label, step = 'any', className }: { value?: number; onChange: (v?: number) => void; label: string; step?: string; className?: string }) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => {
    const parsed = text === '' ? undefined : parseFloat(text.replace(',', '.'));
    if (parsed !== value) setText(value === undefined ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className={`num ${className ?? ''}`}
      inputMode="decimal"
      aria-label={label}
      step={step}
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const v = t === '' ? undefined : parseFloat(t.replace(',', '.'));
        if (t === '' || !isNaN(v!)) onChange(v);
      }}
    />
  );
}

export function Banner({ tone, title, children, actions }: { tone: 'stop' | 'go' | 'info'; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={`banner ${tone}`} role={tone === 'stop' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {children && <div className="banner-body">{children}</div>}
      {actions && <div className="banner-actions">{actions}</div>}
    </section>
  );
}

export function Toast({ text }: { text: string | null }) {
  return text ? <div className="toast" role="status">{text}</div> : null;
}

export function useToast(): [string | null, (t: string) => void] {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(() => setText(null), 2200);
    return () => clearTimeout(id);
  }, [text]);
  return [text, setText];
}

export function PainRuleCard() {
  return (
    <details className="card pain-rule">
      <summary>Pain rule</summary>
      <table>
        <tbody>
          <tr><td><span className="dot z-safe" />0–2</td><td>Safe</td></tr>
          <tr><td><span className="dot z-settle" />3–5</td><td>OK if it has settled by the next morning</td></tr>
          <tr><td><span className="dot z-backoff" />6+</td><td>Above 5, or worse the next morning or week to week: back off for 2–3 days</td></tr>
        </tbody>
      </table>
    </details>
  );
}
