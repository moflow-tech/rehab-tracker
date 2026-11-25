import { useState, type ReactNode } from 'react';

/*
 * Original illustrations for the morning and evening routines.
 * Each exercise has a start and an end frame drawn on a 200×200 canvas.
 * Dark strokes = the working side; light strokes = the other side.
 * The orange arrow shows the direction of movement.
 */

type P = [number, number];
const pts = (...p: P[]) => p.map((q) => q.join(',')).join(' ');

function Limb({ p, ghost }: { p: P[]; ghost?: boolean }) {
  return <polyline points={pts(...p)} className={ghost ? 'fig-ghost' : 'fig-line'} />;
}

interface Pose {
  head: P;
  neck: P;
  hip: P;
  /** shoulder → elbow → hand, near side */
  armN?: P[];
  armF?: P[];
  /** knee, ankle, heel, toe */
  legN: P[];
  legF?: P[];
  /** draw the far leg dark too (both legs working) */
  bothLegs?: boolean;
}

function Person({ head, neck, hip, armN, armF, legN, legF, bothLegs }: Pose) {
  const leg = (l: P[], ghost?: boolean) => (
    <>
      <Limb p={[hip, l[0], l[1]]} ghost={ghost} />
      {l.length === 4 && <Limb p={[l[1], l[2], l[3]]} ghost={ghost} />}
    </>
  );
  return (
    <g>
      {armF && <Limb p={armF} ghost />}
      {legF && leg(legF, !bothLegs)}
      <Limb p={[neck, hip]} />
      {leg(legN)}
      {armN && <Limb p={armN} />}
      <circle cx={head[0]} cy={head[1]} r={13} className="fig-fill" />
    </g>
  );
}

function Arrow({ p, curve }: { p: P[]; curve?: boolean }) {
  const [a, b] = [p[p.length - 2], p[p.length - 1]];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const s = 11;
  const tip: P = [b[0] + Math.cos(ang) * 4, b[1] + Math.sin(ang) * 4];
  const l: P = [tip[0] - s * Math.cos(ang - 0.5), tip[1] - s * Math.sin(ang - 0.5)];
  const r: P = [tip[0] - s * Math.cos(ang + 0.5), tip[1] - s * Math.sin(ang + 0.5)];
  const d = curve && p.length === 3 ? `M${p[0]} Q${p[1]} ${p[2]}` : `M${p.map((q) => q.join(',')).join(' L')}`;
  return (
    <g>
      <path d={d} className="arrow" />
      <polygon points={pts(tip, l, r)} className="arrow-head" />
    </g>
  );
}

const Floor = ({ y = 188 }: { y?: number }) => <line x1={6} x2={194} y1={y} y2={y} className="prop" />;
const Wall = ({ x }: { x: number }) => (
  <>
    <rect x={x} y={20} width={14} height={168} className="prop-fill" />
    <line x1={x} x2={x} y1={20} y2={188} className="prop" />
  </>
);
const Label = ({ x, y, children, end }: { x: number; y: number; children: ReactNode; end?: boolean }) => (
  <text x={x} y={y} className="svg-label" textAnchor={end ? 'end' : 'start'}>
    {children}
  </text>
);
const Chair = () => (
  <g className="prop">
    <line x1={30} y1={118} x2={96} y2={118} />
    <line x1={34} y1={118} x2={34} y2={188} />
    <line x1={92} y1={118} x2={92} y2={188} />
    <line x1={34} y1={118} x2={34} y2={56} />
  </g>
);

// ---------- seated base pose (facing right) ----------
const seated = (toe: P, extra?: Partial<Pose>): Pose => ({
  head: [62, 38],
  neck: [60, 54],
  hip: [58, 112],
  armN: [[60, 62], [78, 96], [104, 104]],
  legN: [[118, 110], [124, 172], [118, 182], toe],
  legF: [[114, 113], [118, 174], [112, 183], [140, 184]],
  ...extra,
});
const FOOT_FLAT: P = [150, 183];
const FOOT_UP: P = [146, 160];

// ---------- standing base pose (facing right) ----------
const stand = (o: Partial<Pose> = {}): Pose => ({
  head: [100, 34],
  neck: [100, 50],
  hip: [100, 108],
  armN: [[100, 58], [104, 86], [108, 110]],
  legN: [[102, 148], [100, 180], [94, 187], [122, 187]],
  legF: [[98, 148], [96, 180], [90, 187], [118, 187]],
  ...o,
});

interface Frames {
  alt: string;
  start: { label: string; svg: ReactNode };
  end: { label: string; svg: ReactNode };
}

const footPath = (archY: number, ballX: number, toeY = 168) =>
  `M104 40 L106 104 Q118 120 ${ballX - 10} 146 L188 ${toeY - 10} Q194 ${toeY - 4} 188 ${toeY}
   L${ballX} ${toeY} Q${(ballX + 70) / 2} ${archY} 74 168 Q58 166 62 140 Q70 118 74 104 L72 40`;

const toes = (bigUp: boolean) => {
  const xs = [52, 84, 108, 130, 150];
  const ws = [28, 20, 18, 16, 14];
  const hs = [34, 28, 26, 22, 18];
  return xs.map((x, i) => {
    const up = i === 0 ? bigUp : !bigUp;
    const y = 128 - hs[i] - (up ? 26 : 0);
    return <rect key={i} x={x} y={y} width={ws[i]} height={hs[i] + 6} rx={ws[i] / 2} className={up ? 'toe up' : 'toe'} />;
  });
};

export const ILLUSTRATIONS: Record<string, Frames> = {
  ktw: {
    alt: 'Side view: split stance facing a wall, band pulling the front ankle backward. The front knee moves forward toward the wall while the heel stays down.',
    start: {
      label: 'Knee over ankle',
      svg: (
        <>
          <Wall x={176} />
          <Floor />
          <line x1={14} y1={150} x2={14} y2={188} className="prop" />
          <polyline points={pts([14, 172], [124, 178])} className="band" />
          <Person
            head={[96, 34]} neck={[96, 50]} hip={[94, 108]}
            armN={[[96, 58], [120, 76], [150, 84]]}
            legN={[[126, 142], [126, 178], [120, 187], [150, 187]]}
            legF={[[76, 146], [56, 178], [50, 187], [76, 187]]}
          />
          <Label x={112} y={204}>heel down</Label>
        </>
      ),
    },
    end: {
      label: 'Knee to wall, 3 s',
      svg: (
        <>
          <Wall x={176} />
          <Floor />
          <line x1={14} y1={150} x2={14} y2={188} className="prop" />
          <polyline points={pts([14, 172], [126, 178])} className="band" />
          <Person
            head={[112, 36]} neck={[110, 52]} hip={[104, 110]}
            armN={[[110, 60], [140, 70], [174, 76]]}
            legN={[[156, 144], [126, 178], [120, 187], [150, 187]]}
            legF={[[84, 148], [58, 178], [52, 187], [78, 187]]}
          />
          <Arrow p={[[140, 128], [166, 128]]} />
          <Label x={112} y={204}>heel down</Label>
        </>
      ),
    },
  },

  slant: {
    alt: 'Side view: standing on a slant board, toes higher than heels, hands on a wall. First with the knee straight and hips forward, then with the knee bent forward.',
    start: {
      label: 'Knee straight',
      svg: (
        <>
          <Wall x={178} />
          <Floor />
          <polygon points={pts([80, 188], [150, 188], [150, 162])} className="prop-fill" />
          <polyline points={pts([80, 188], [150, 162], [150, 188])} className="prop" />
          <Person
            head={[120, 34]} neck={[118, 50]} hip={[112, 106]}
            armN={[[118, 58], [146, 72], [176, 78]]}
            legN={[[108, 142], [104, 174], [98, 180], [128, 170]]}
          />
          <Arrow p={[[100, 96], [124, 96]]} />
          <Label x={30} y={100}>hips</Label>
        </>
      ),
    },
    end: {
      label: 'Knee bent',
      svg: (
        <>
          <Wall x={178} />
          <Floor />
          <polygon points={pts([80, 188], [150, 188], [150, 162])} className="prop-fill" />
          <polyline points={pts([80, 188], [150, 162], [150, 188])} className="prop" />
          <Person
            head={[112, 42]} neck={[110, 58]} hip={[100, 114]}
            armN={[[110, 66], [142, 76], [176, 80]]}
            legN={[[128, 140], [104, 174], [98, 180], [128, 170]]}
          />
          <Arrow p={[[126, 120], [148, 120]]} />
          <Label x={136} y={110}>knee</Label>
        </>
      ),
    },
  },

  shortfoot: {
    alt: 'Close-up side view of the foot. The arch lifts into a dome as the ball of the big toe draws toward the heel; the toes stay long and flat.',
    start: {
      label: 'Relaxed foot',
      svg: (
        <>
          <Floor y={170} />
          <path d={footPath(162, 150)} className="foot" />
          <Label x={100} y={196}>flat arch</Label>
        </>
      ),
    },
    end: {
      label: 'Dome the arch, 5 s',
      svg: (
        <>
          <Floor y={170} />
          <path d={footPath(128, 142)} className="foot" />
          <Arrow p={[[146, 182], [96, 182]]} />
          <Arrow p={[[108, 158], [108, 134]]} />
          <Label x={40} y={204}>toes stay long</Label>
        </>
      ),
    },
  },

  toeyoga: {
    alt: 'Front view of the toes. First the big toe lifts while the other four stay down; then the big toe presses down while the other four lift.',
    start: {
      label: 'Big toe up',
      svg: (
        <>
          <Floor y={172} />
          <path d="M44 128 Q40 168 60 170 L160 170 Q172 168 168 128 Z" className="foot" />
          {toes(true)}
          <Arrow p={[[66, 70], [66, 44]]} />
          <Label x={100} y={196}>others down</Label>
        </>
      ),
    },
    end: {
      label: 'Small toes up',
      svg: (
        <>
          <Floor y={172} />
          <path d="M44 128 Q40 168 60 170 L160 170 Q172 168 168 128 Z" className="foot" />
          {toes(false)}
          <Arrow p={[[120, 64], [120, 40]]} />
          <Label x={30} y={196}>big toe down</Label>
        </>
      ),
    },
  },

  tib1: {
    alt: 'Side view: seated on a chair. The forefoot lifts toward the shin as one block while the heel stays on the floor.',
    start: { label: 'Foot flat', svg: (<><Chair /><Floor /><Person {...seated(FOOT_FLAT)} /></>) },
    end: {
      label: 'Lift, hold 2 s',
      svg: (
        <>
          <Chair /><Floor />
          <Person {...seated(FOOT_UP)} />
          <Arrow p={[[170, 182], [176, 160], [160, 146]]} curve />
          <Label x={96} y={204}>heel stays down</Label>
        </>
      ),
    },
  },

  tib2: {
    alt: 'Side view: seated, leaning forward with a hand pressing down on top of the forefoot. The foot pushes up into the hand without moving.',
    start: {
      label: 'Hand on top of foot',
      svg: (
        <>
          <Chair /><Floor />
          <Person {...seated(FOOT_FLAT, { head: [104, 52], neck: [94, 66], armN: [[94, 72], [124, 118], [140, 176]] })} />
        </>
      ),
    },
    end: {
      label: 'Push up ~70%, no movement',
      svg: (
        <>
          <Chair /><Floor />
          <Person {...seated(FOOT_FLAT, { head: [104, 52], neck: [94, 66], armN: [[94, 72], [124, 118], [140, 176]] })} />
          <Arrow p={[[164, 186], [164, 164]]} />
          <Arrow p={[[150, 128], [150, 158]]} />
          <Label x={158} y={140}>hold</Label>
        </>
      ),
    },
  },

  tib3: {
    alt: 'Side view: seated with a band around the forefoot, anchored low in front. The forefoot lifts against the band while the heel stays down.',
    start: {
      label: 'Band on forefoot',
      svg: (
        <>
          <Chair /><Floor />
          <rect x={184} y={164} width={10} height={24} className="prop-fill" />
          <polyline points={pts([146, 182], [186, 176])} className="band" />
          <Person {...seated(FOOT_FLAT)} />
        </>
      ),
    },
    end: {
      label: 'Lift against band',
      svg: (
        <>
          <Chair /><Floor />
          <rect x={184} y={164} width={10} height={24} className="prop-fill" />
          <polyline points={pts([142, 162], [186, 176])} className="band" />
          <Person {...seated(FOOT_UP)} />
          <Arrow p={[[160, 138], [140, 132], [130, 148]]} curve />
        </>
      ),
    },
  },

  tib4: {
    alt: 'Side view: standing. The front of the working foot starts lifted, then lowers slowly to the floor over four seconds.',
    start: {
      label: 'Forefoot up',
      svg: (
        <>
          <Floor />
          <Person {...stand({ legN: [[102, 148], [100, 180], [94, 187], [120, 170]] })} />
        </>
      ),
    },
    end: {
      label: 'Lower over 4 s',
      svg: (
        <>
          <Floor />
          <Person {...stand()} />
          <Arrow p={[[134, 154], [148, 166], [136, 180]]} curve />
          <Label x={142} y={150}>4 s</Label>
        </>
      ),
    },
  },

  tib5: {
    alt: 'Side view: leaning back against a wall with the heels 10–15 cm out and legs straight. Both forefeet lift toward the shins.',
    start: {
      label: 'Back on wall',
      svg: (
        <>
          <Wall x={22} />
          <Floor />
          <Person
            head={[50, 34]} neck={[50, 50]} hip={[56, 108]}
            armN={[[50, 58], [54, 86], [58, 108]]}
            legN={[[64, 146], [72, 180], [66, 187], [94, 187]]}
            legF={[[62, 146], [70, 180], [64, 187], [92, 187]]}
          />
          <line x1={36} x2={66} y1={200} y2={200} className="prop" />
          <Label x={74} y={204}>10–15 cm</Label>
        </>
      ),
    },
    end: {
      label: 'Lift both forefeet',
      svg: (
        <>
          <Wall x={22} />
          <Floor />
          <Person
            head={[50, 34]} neck={[50, 50]} hip={[56, 108]}
            armN={[[50, 58], [54, 86], [58, 108]]}
            legN={[[64, 146], [72, 180], [66, 187], [90, 168]]}
            legF={[[62, 146], [70, 180], [64, 187], [88, 168]]}
            bothLegs
          />
          <Arrow p={[[118, 186], [124, 164], [106, 152]]} curve />
          <Label x={74} y={204}>heels stay down</Label>
        </>
      ),
    },
  },

  clam: {
    alt: 'Front view: quarter squat with a mini-band just above the knees. One knee turns outward against the band while both feet stay planted.',
    start: {
      label: 'Quarter squat',
      svg: (
        <>
          <Floor />
          <Front kneeOut={0} />
        </>
      ),
    },
    end: {
      label: 'Knee out, return slowly',
      svg: (
        <>
          <Floor />
          <Front kneeOut={1} />
          <Arrow p={[[146, 124], [168, 124]]} />
          <Label x={36} y={204}>feet planted</Label>
        </>
      ),
    },
  },

  balance: {
    alt: 'Front view next to a counter: standing on two feet, then on one leg with the other foot lifted, hips level and knee soft.',
    start: {
      label: 'Stand tall',
      svg: (
        <>
          <Floor />
          <Counter />
          <g>
            <Limb p={[[88, 108], [86, 146], [88, 182], [80, 186]]} />
            <Limb p={[[112, 108], [114, 146], [112, 182], [120, 186]]} />
            <Limb p={[[100, 50], [100, 108]]} />
            <Limb p={[[88, 108], [112, 108]]} />
            <Limb p={[[90, 58], [80, 84], [76, 106]]} />
            <Limb p={[[110, 58], [126, 80], [146, 96]]} />
            <circle cx={100} cy={34} r={13} className="fig-fill" />
          </g>
        </>
      ),
    },
    end: {
      label: 'One leg, 30 s',
      svg: (
        <>
          <Floor />
          <Counter />
          <g>
            <Limb p={[[94, 108], [90, 140], [96, 160], [88, 163]]} ghost />
            <Limb p={[[116, 108], [116, 146], [112, 182], [120, 186]]} />
            <Limb p={[[106, 50], [106, 108]]} />
            <Limb p={[[94, 108], [116, 108]]} />
            <Limb p={[[96, 58], [86, 84], [82, 106]]} />
            <Limb p={[[116, 58], [130, 80], [148, 96]]} />
            <circle cx={106} cy={34} r={13} className="fig-fill" />
          </g>
          <line x1={74} x2={138} y1={100} y2={100} className="arrow" strokeDasharray="4 5" />
          <Label x={20} y={204}>hips level, knee soft</Label>
        </>
      ),
    },
  },

  heelstraight: {
    alt: 'Side view: standing with straight knees and fingertips on a wall. Rise onto the balls of the feet, then lower slowly over three seconds.',
    start: {
      label: 'Knees straight',
      svg: (<><Wall x={170} /><Floor /><Person {...stand({ armN: [[100, 58], [130, 76], [168, 84]] })} /></>),
    },
    end: {
      label: 'Rise, 3 s down',
      svg: (
        <>
          <Wall x={170} /><Floor />
          <Person {...stand({
            head: [102, 20], neck: [102, 36], hip: [102, 94],
            armN: [[102, 44], [132, 64], [168, 72]],
            legN: [[104, 134], [104, 166], [100, 174], [124, 187]],
            legF: [[100, 134], [100, 166], [96, 174], [120, 187]],
          })} />
          <Arrow p={[[72, 180], [72, 152]]} />
          <Label x={38} y={204}>over big toe</Label>
        </>
      ),
    },
  },

  heelbent: {
    alt: 'Side view: standing with knees bent about 30 degrees, fingertips on a wall. Rise onto the balls of the feet keeping the same knee bend.',
    start: {
      label: 'Knees bent ~30°',
      svg: (
        <>
          <Wall x={170} /><Floor />
          <Person {...stand({
            head: [94, 44], neck: [94, 60], hip: [88, 116],
            armN: [[94, 68], [128, 84], [168, 90]],
            legN: [[114, 148], [102, 180], [96, 187], [124, 187]],
            legF: [[110, 148], [98, 180], [92, 187], [120, 187]],
          })} />
        </>
      ),
    },
    end: {
      label: 'Rise, keep the bend',
      svg: (
        <>
          <Wall x={170} /><Floor />
          <Person {...stand({
            head: [96, 30], neck: [96, 46], hip: [90, 102],
            armN: [[96, 54], [130, 72], [168, 78]],
            legN: [[116, 134], [106, 166], [102, 174], [126, 187]],
            legF: [[112, 134], [102, 166], [98, 174], [122, 187]],
          })} />
          <Arrow p={[[66, 180], [66, 152]]} />
        </>
      ),
    },
  },

  wallsit: {
    alt: 'Side view: standing with the back against a wall, then sliding down until the knees are bent and holding at about 7 out of 10 effort.',
    start: {
      label: 'Back to wall',
      svg: (
        <>
          <Wall x={22} /><Floor />
          <Person
            head={[50, 34]} neck={[48, 50]} hip={[48, 108]}
            armN={[[48, 58], [50, 86], [52, 108]]}
            legN={[[64, 146], [76, 180], [70, 187], [98, 187]]}
            legF={[[62, 146], [74, 180], [68, 187], [96, 187]]}
          />
        </>
      ),
    },
    end: {
      label: 'Slide down, hold',
      svg: (
        <>
          <Wall x={22} /><Floor />
          <Person
            head={[50, 74]} neck={[48, 90]} hip={[48, 140]}
            armN={[[48, 98], [62, 118], [84, 132]]}
            legN={[[94, 138], [92, 180], [86, 187], [114, 187]]}
            legF={[[92, 140], [90, 180], [84, 187], [112, 187]]}
          />
          <Arrow p={[[84, 44], [84, 74]]} />
          <Label x={110} y={110}>~7/10</Label>
        </>
      ),
    },
  },

  sideplank: {
    alt: 'Front view: side plank on the forearm with the body in one straight line, then the top leg lifts and holds.',
    start: {
      label: 'Hips up, one line',
      svg: (
        <>
          <Floor />
          <Limb p={[[52, 140], [52, 182], [80, 186]]} />
          <Limb p={[[52, 140], [118, 162], [186, 184]]} />
          <Limb p={[[118, 158], [184, 178]]} ghost />
          <Limb p={[[56, 136], [84, 116], [112, 150]]} ghost />
          <circle cx={36} cy={126} r={13} className="fig-fill" />
        </>
      ),
    },
    end: {
      label: 'Lift top leg, 20 s',
      svg: (
        <>
          <Floor />
          <Limb p={[[52, 140], [52, 182], [80, 186]]} />
          <Limb p={[[52, 140], [118, 162], [186, 184]]} />
          <Limb p={[[118, 156], [180, 120]]} />
          <Limb p={[[56, 136], [84, 116], [112, 150]]} ghost />
          <circle cx={36} cy={126} r={13} className="fig-fill" />
          <Arrow p={[[176, 168], [182, 136]]} />
        </>
      ),
    },
  },
};

function Front({ kneeOut }: { kneeOut: number }) {
  const kx = 122 + kneeOut * 22;
  return (
    <g>
      <Limb p={[[88, 112], [80, 148], [84, 182], [74, 186]]} />
      <Limb p={[[112, 112], [kx, 148 - kneeOut * 4], [116, 182], [126, 186]]} />
      <polyline points={pts([80, 138], [kx - 1, 138 - kneeOut * 4])} className="band" />
      <Limb p={[[100, 58], [100, 112]]} />
      <Limb p={[[88, 112], [112, 112]]} />
      <Limb p={[[90, 64], [74, 88], [88, 110]]} />
      <Limb p={[[110, 64], [126, 88], [112, 110]]} />
      <circle cx={100} cy={42} r={13} className="fig-fill" />
    </g>
  );
}

function Counter() {
  return (
    <g>
      <rect x={148} y={96} width={46} height={92} className="prop-fill" />
      <line x1={144} x2={194} y1={96} y2={96} className="prop" />
    </g>
  );
}

export function Illustration({ id }: { id: string }) {
  const [anim, setAnim] = useState(false);
  const f = ILLUSTRATIONS[id];
  if (!f) return null;
  return (
    <figure className="illus">
      <div className={`illus-frames ${anim ? 'anim' : ''}`} role="img" aria-label={f.alt}>
        {[f.start, f.end].map((fr, i) => (
          <div className="frame" key={i}>
            <svg viewBox="0 0 200 210" aria-hidden="true">
              {fr.svg}
            </svg>
            <div className="frame-label">
              {i === 0 ? 'Start' : 'End'}: {fr.label}
            </div>
          </div>
        ))}
      </div>
      <figcaption>
        <span>Dark = working side · orange = movement</span>
        <button className="btn ghost small" onClick={() => setAnim(!anim)}>
          {anim ? 'Show side by side' : '▶ Play'}
        </button>
      </figcaption>
    </figure>
  );
}
