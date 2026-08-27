// Scattered koi behind the page content — the school, seen much deeper than in
// the hero. Positions come from a seeded LCG so a panel looks the same on every
// load, and from rejection sampling so no two fish overlap.
import { useMemo } from 'react';
import KoiMark from './KoiMark';

type Fish = {
  top: number; // % of panel height
  left: number; // % of panel width
  size: number; // % of panel width
  opacity: number;
  rotate: number;
  flip: boolean;
  dur: number;
  delay: number;
};

// panels run roughly 2:1, and everything below is measured in % of width, so
// vertical gaps convert through this
const ASPECT = 2;
const GAP = 2.5; // % of width kept clear between silhouettes
const BODY_RATIO = 36 / 116; // viewBox height / width

function school(seed: number, count: number, maxOpacity: number): Fish[] {
  let a = seed >>> 0;
  const rand = () => ((a = (a * 1664525 + 1013904223) >>> 0), a / 4294967296);

  const placed: Fish[] = [];
  let guard = 0;

  while (placed.length < count && guard++ < 600) {
    const size = 13 + rand() * 12; // 13-25% of panel width
    const halfH = (size * BODY_RATIO) / 2;
    // biased right: the copy is left-aligned and capped at 58ch, so the right
    // half of every panel is free
    const left = 32 + rand() * (66 - size);
    const top = 6 + rand() * 82;

    // treat each fish as a circle in width units; the tail is thin, so half
    // the body length is a generous bound
    const r = Math.max(size / 2, halfH) * 0.72;
    const clash = placed.some((f) => {
      const fr = Math.max(f.size / 2, (f.size * BODY_RATIO) / 2) * 0.72;
      const dx = f.left + f.size / 2 - (left + size / 2);
      const dy = (f.top - top) / ASPECT;
      return Math.hypot(dx, dy) < r + fr + GAP;
    });
    if (clash) continue;

    placed.push({
      top,
      left,
      size,
      opacity: maxOpacity * (0.55 + rand() * 0.45),
      rotate: -18 + rand() * 36,
      flip: rand() > 0.55,
      dur: 38 + rand() * 38,
      delay: -rand() * 40,
    });
  }

  return placed;
}

export default function KoiField({
  seed,
  count = 5,
  maxOpacity = 0.08,
}: {
  seed: number;
  count?: number;
  maxOpacity?: number;
}) {
  const fish = useMemo(
    () => school(seed, count, maxOpacity),
    [seed, count, maxOpacity]
  );

  return (
    <div className="koi-field" aria-hidden="true">
      {fish.map((f, i) => (
        <span
          key={i}
          className="koi-fish"
          style={
            {
              top: `${f.top}%`,
              left: `${f.left}%`,
              width: `${f.size}%`,
              opacity: f.opacity,
              '--rot': `${f.rotate}deg`,
              '--flip': f.flip ? -1 : 1,
              '--dur': `${f.dur}s`,
              '--delay': `${f.delay}s`,
            } as React.CSSProperties
          }
        >
          <KoiMark className="koi koi--field" />
        </span>
      ))}
    </div>
  );
}
