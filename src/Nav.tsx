// Fixed pill nav, after oimachi.co: no bar background at all — each item is its
// own small pill, so it reads over the video and over the panels without a
// chrome strip. The active section is inverted, as it is there, and tracked for
// real rather than set by hand.
import { useEffect, useState } from 'react';
import KoiMark from './KoiMark';

const ITEMS: [string, string][] = [
  ['About', 'about'],
  ['Experience', 'experience'],
  ['Contact', 'contact'],
];

export default function Nav() {
  const [active, setActive] = useState('');

  // A probe line at 35% of the viewport picks the section it falls inside.
  // IntersectionObserver was wrong for this: a -20%/-60% band is 20% tall, and
  // a section taller than that never crosses the thresholds, so the active
  // pill either never set or flickered between neighbours.
  useEffect(() => {
    let frame = 0;
    const pick = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const probe = innerHeight * 0.35;
        let current = '';
        for (const [, id] of ITEMS) {
          const el = document.getElementById(id);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.top <= probe && r.bottom > probe) current = id;
        }
        // past the last section (footer), keep the last one lit
        if (!current) {
          const last = document.getElementById(ITEMS[ITEMS.length - 1][1]);
          if (last && last.getBoundingClientRect().bottom <= probe) {
            current = ITEMS[ITEMS.length - 1][1];
          }
        }
        setActive(current);
      });
    };
    pick();
    addEventListener('scroll', pick, { passive: true });
    addEventListener('resize', pick);
    return () => {
      removeEventListener('scroll', pick);
      removeEventListener('resize', pick);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <nav className="nav" aria-label="Sections">
      <div className="nav-group">
        <a className="nav-mark" href="#top" aria-label="Top">
          <KoiMark className="koi koi--nav" />
        </a>
        {ITEMS.map(([label, id]) => (
          <a
            key={id}
            className={active === id ? 'pill pill--on' : 'pill'}
            href={`#${id}`}
            aria-current={active === id ? 'true' : undefined}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="nav-group">
        {/* TODO(nano): real address */}
        <a className="pill pill--accent" href="mailto:hello@example.com">
          Email
        </a>
      </div>
    </nav>
  );
}
