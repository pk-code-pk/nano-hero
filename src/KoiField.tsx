// Scattered koi behind the page content — the school, seen much deeper than in
// the hero. Positions come from a seeded LCG so a given panel looks the same on
// every load and between server and client.
import { useMemo } from 'react';
import KoiMark from './KoiMark';

type Fish = {
  top: number;
  left: number;
  size: number;
  opacity: number;
  rotate: number;
  flip: boolean;
  dur: number;
  delay: number;
};

function school(seed: number, count: number, maxOpacity: number): Fish[] {
  let a = seed >>> 0;
  const rand = () => ((a = (a * 1664525 + 1013904223) >>> 0), a / 4294967296);
  return Array.from({ length: count }, () => ({
    top: 4 + rand() * 88,
    // biased right: the copy is left-aligned and capped at 58ch, so the right
    // half of every panel is empty
    left: 34 + rand() * 60,
    size: 54 + rand() * 150,
    opacity: maxOpacity * (0.45 + rand() * 0.55),
    rotate: -22 + rand() * 44,
    flip: rand() > 0.55,
    dur: 34 + rand() * 40,
    delay: -rand() * 40,
  }));
}

export default function KoiField({
  seed,
  count = 6,
  maxOpacity = 0.07,
}: {
  seed: number;
  count?: number;
  maxOpacity?: number;
}) {
  const fish = useMemo(() => school(seed, count, maxOpacity), [seed, count, maxOpacity]);

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
              width: `${f.size}px`,
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
