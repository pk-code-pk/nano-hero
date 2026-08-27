// Personal site for nano. The pond is the hero; everything below it descends
// from the lit surface into deep water as you scroll.
import { useEffect, useRef } from 'react';
import PondHero from './PondHero';

type Entry = {
  title: string;
  blurb: string;
  meta: string; // year + discipline
  tag: string; // what stage it's at
  href?: string;
};

// TODO(nano): replace these with real projects. Each blurb wants one line:
// what it is, what you owned, and the number that proves it worked.
const WORK: Entry[] = [
  {
    title: 'Project title',
    blurb:
      'What it does, what you designed, and the result that proves it — a load held, a tolerance hit, a cycle time cut.',
    meta: '2026 · manufacturing',
    tag: 'built',
  },
  {
    title: 'Project title',
    blurb:
      'A test rig, a fixture, a linkage. Say what constraint made it hard and what you did about it.',
    meta: '2025 · design for manufacture',
    tag: 'shipped',
  },
  {
    title: 'Project title',
    blurb:
      'Analysis-heavy work belongs here: the model, what you validated it against, and how far off it was.',
    meta: '2025 · test and validation',
    tag: 'in test',
  },
];

type Role = {
  org: string;
  role: string;
  period: string;
  where?: string;
  now?: boolean;
};

// Reverse chronological. Dates carry real information here, so this is a
// timeline rather than a list.
const EXPERIENCE: Role[] = [
  {
    org: 'Kostas Research Institute',
    role: 'Research assistant',
    period: 'May 2026 —',
    where: 'Northeastern',
    now: true,
  },
  {
    org: 'Transformative Robotics Lab',
    role: 'Research assistant',
    period: 'Feb 2026 —',
    where: 'Northeastern',
    now: true,
  },
  {
    org: 'Bevi',
    role: 'Manufacturing engineer co-op',
    period: 'Jan — Jun 2026',
    where: 'Boston, MA',
  },
  {
    org: 'Give A Hand',
    role: 'Design and CAD engineer',
    period: 'Sep 2025 —',
    now: true,
  },
  {
    org: 'BKF Aerospace',
    role: 'Mechanical engineering intern',
    period: 'Jul — Aug 2024',
    where: 'Bangkok',
  },
  {
    org: 'TEDxYouth',
    role: 'Conference president',
    period: '2022 — 2024',
  },
  {
    org: 'Society of Women Engineers',
    role: 'Project lead',
    period: '2023 — 2024',
  },
];

function useReveal() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    // scroll depth drives the page's descent
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = Math.max(1, document.body.scrollHeight - innerHeight);
        const d = Math.min(1, Math.max(0, scrollY / max));
        document.documentElement.style.setProperty('--depth', d.toFixed(3));
      });
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = el.querySelectorAll('.rise');
    if (reduce || typeof IntersectionObserver === 'undefined') {
      targets.forEach((t) => t.classList.add('shown'));
    } else {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('shown');
              io.unobserve(e.target);
            }
          }),
        { rootMargin: '-8% 0px -12%' }
      );
      targets.forEach((t) => io.observe(t));
      return () => {
        io.disconnect();
        removeEventListener('scroll', onScroll);
        cancelAnimationFrame(frame);
      };
    }

    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return root;
}

// A rippling rule down the left margin — the pond's surface, seen edge-on
function Waterline() {
  return (
    <div className="waterline" aria-hidden="true">
      <svg viewBox="0 0 12 800" preserveAspectRatio="none" fill="none">
        <path
          d="M6 0 C 2 60, 10 120, 6 180 S 2 300, 6 360 S 10 480, 6 540 S 2 660, 6 720 S 8 780, 6 800"
          stroke="rgba(127,199,232,0.32)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function Band({
  label,
  children,
  id,
}: {
  label: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section className="band" id={id}>
      <div className="band-head rise">
        <b />
        <span>{label}</span>
      </div>
      {children}
    </section>
  );
}

export default function Site() {
  const root = useReveal();

  return (
    <div ref={root}>
      <PondHero />
      <Waterline />

      <main className="shell">
        <Band label="What I do">
          <div className="split">
            <h1 className="statement rise">
              Mechanical design that <i>survives contact with</i> the{' '}
              <em>factory floor</em>.
            </h1>
            <p className="prose rise">
            {/* TODO(nano): rewrite in your own voice — what you're working on
                at Bevi, and what you want to build next. */}
            I'm a mechanical engineering student at Northeastern, doing research
            at the Kostas Research Institute and the Transformative Robotics
            Lab. Before that I spent six months as a manufacturing engineer
            co-op at Bevi, where the drawing meets the line: fixtures,
            tolerance stacks, DFM reviews, and the unglamorous revisions that
            come after something fails in assembly.
            </p>
          </div>
        </Band>

        <Band label="Selected work" id="work">
          <div className="split">
            <div>
              <h2 className="statement rise">
                Things I <i>designed</i>, built, and had to fix.
              </h2>
              <p className="split-note rise">
                Ordered by recency. Each one lists what it is, what I owned, and
                the result that proved it worked.
              </p>
            </div>
            <div className="work">
              {WORK.map((w, i) => {
                const Tag = w.href ? 'a' : 'div';
                return (
                  <Tag
                    key={i}
                    className="entry rise"
                    {...(w.href
                      ? { href: w.href, target: '_blank', rel: 'noreferrer' }
                      : {})}
                  >
                    <span className="entry-index">
                      ({String(i + 1).padStart(2, '0')})
                    </span>
                    <span className="entry-body">
                      <h3>{w.title}</h3>
                      <p>{w.blurb}</p>
                    </span>
                    <span className="entry-right">
                      <span className="entry-tag">{w.tag}</span>
                      <span className="entry-year">{w.meta}</span>
                    </span>
                  </Tag>
                );
              })}
            </div>
          </div>
        </Band>

        <Band label="Where I've worked">
          <div className="split">
            <div>
              <h2 className="statement rise">
                Research labs, a <i>factory floor</i>, and a design bench.
              </h2>
              <p className="split-note rise">
                Three of these are current. The co-op at Bevi is where I learned
                what a drawing costs once it reaches assembly.
              </p>
            </div>
            <div className="work">
              {EXPERIENCE.map((r, i) => (
                <div className="entry rise" key={r.org}>
                  <span className="entry-index">
                    ({String(i + 1).padStart(2, '0')})
                  </span>
                  <span className="entry-body">
                    <h3>{r.org}</h3>
                    <p>
                      {r.role}
                      {r.where ? ` · ${r.where}` : ''}
                    </p>
                  </span>
                  <span className="entry-right">
                    {r.now ? <span className="entry-tag on">now</span> : null}
                    <span className="entry-year">{r.period}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Band>

        <Band label="Reach">
          <div className="mark rise" aria-hidden="true" />
          <h2 className="statement rise">
            Building something that <i>has to hold</i> together?
          </h2>
          <div className="reach rise">
            {/* TODO(nano): real links */}
            <a href="mailto:hello@example.com">
              Email<span className="arrow">↗</span>
            </a>
            <a href="#" target="_blank" rel="noreferrer">
              Résumé<span className="arrow">↗</span>
            </a>
            <a href="#" target="_blank" rel="noreferrer">
              LinkedIn<span className="arrow">↗</span>
            </a>
          </div>
        </Band>

        <div className="colophon">
          <span>Nano Eiamwattanasin — mechanical engineering</span>
          <span>Hero rendered live: koi, caustics, ASCII</span>
        </div>
      </main>
    </div>
  );
}
