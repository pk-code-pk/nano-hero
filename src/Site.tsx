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
  // the number that proves it worked, and how it was measured
  result?: { value: string; caption: string; delta?: string };
  spec?: [string, string][];
};

// TODO(nano): replace with real projects. Each one wants a blurb saying what
// you owned, a result number with how it was measured, and a few real specs.
// The number is the point — "held 1.8 kN" beats "designed a bracket".
const WORK: Entry[] = [
  {
    title: 'Project title',
    blurb:
      'What it is, what constraint made it hard, and what you owned end to end.',
    meta: '2026 · manufacturing',
    tag: 'built',
    result: {
      value: '-38%',
      caption: 'Assembly time per unit',
      delta: '6m 20s → 3m 55s',
    },
    spec: [
      ['Materials', '6061-T6, PETG'],
      ['Process', '3-axis mill, printed fixture'],
      ['Tolerance', '±0.05 mm'],
      ['Owned', 'Design, fixture, line trial'],
    ],
  },
  {
    title: 'Project title',
    blurb:
      'A test rig, a linkage, a fixture. What you measured and how close the model got.',
    meta: '2025 · design for manufacture',
    tag: 'shipped',
    result: {
      value: '1.8 kN',
      caption: 'Held at failure, 12% over spec',
      delta: 'Predicted 1.6 kN',
    },
    spec: [
      ['Analysis', 'Static FEA, hand-checked'],
      ['Validation', 'Instron pull to failure'],
      ['Iterations', '3'],
      ['Owned', 'CAD, analysis, test plan'],
    ],
  },
  {
    title: 'Project title',
    blurb:
      'Research or coursework belongs here too, as long as something got built and measured.',
    meta: '2025 · test and validation',
    tag: 'in test',
    result: {
      value: '0.4 mm',
      caption: 'Repeatability across 50 cycles',
      delta: 'Target 1.0 mm',
    },
    spec: [
      ['Instrumentation', 'Dial indicator, load cell'],
      ['Cycles', '50'],
      ['Owned', 'Rig design, data reduction'],
    ],
  },
];

// TODO(nano): trim to what you'd defend in an interview.
const CAPABILITIES: {
  title: string;
  body: string;
  figure: React.ReactNode;
}[] = [
  {
    title: 'Design',
    body: 'Solid modelling, GD&T, tolerance stacks, and DFM reviews before anything gets cut.',
    figure: (
      <svg className="cell-figure" viewBox="0 0 120 90" aria-hidden="true">
        <rect x="18" y="22" width="66" height="46" />
        <rect x="30" y="34" width="66" height="46" className="hot" />
        <path d="M18 14h66M18 10v8M84 10v8" />
      </svg>
    ),
  },
  {
    title: 'Manufacturing',
    body: 'Fixturing, process documentation, and the revisions that come after a part fails in assembly.',
    figure: (
      <svg className="cell-figure" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M14 68h92" />
        <path d="M28 68V40l14-10h30l14 10v28" />
        <circle cx="57" cy="46" r="11" className="hot" />
        <path d="M24 76h68" />
      </svg>
    ),
  },
  {
    title: 'Test',
    body: 'Instrumented rigs, failure analysis, and revising the part until the data agrees with the model.',
    figure: (
      <svg className="cell-figure" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M20 74V16M20 74h84" />
        <path d="M26 66l20-14 18 8 20-30" className="hot" />
        <path d="M26 70l20-6 18 4 20-12" />
      </svg>
    ),
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

const NAV: [string, string][] = [
  ['What I do', '#about'],
  ['Selected work', '#work'],
  ['Experience', '#experience'],
  ['Reach', '#reach'],
];

// TODO(nano): real URLs
const ELSEWHERE: [string, string][] = [
  ['LinkedIn', '#'],
  ['GitHub', '#'],
  ['Email', 'mailto:hello@example.com'],
];

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid" aria-hidden="true" />

      <div className="footer-cols">
        <div className="footer-col footer-lede">
          <b className="footer-tick" aria-hidden="true" />
          <p>
            Open to co-op and full-time mechanical engineering roles, starting
            2027.
          </p>
          <a className="footer-mail" href="mailto:hello@example.com">
            hello@example.com
          </a>
        </div>

        <div className="footer-col">
          <span className="footer-label">Navigation</span>
          <ul>
            {NAV.map(([label, href]) => (
              <li key={label}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <span className="footer-label">Elsewhere</span>
          <ul>
            {ELSEWHERE.map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  {...(href.startsWith('http')
                    ? { target: '_blank', rel: 'noreferrer' }
                    : {})}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col footer-top">
          <span className="footer-label">Back to top</span>
          <a href="#top" aria-label="Back to top">
            ↑
          </a>
        </div>
      </div>

      <div className="footer-meta">
        <span>Nano Eiamwattanasin — mechanical engineering</span>
        <span>Hero filmed from a live koi pond render</span>
      </div>

      {/* the closing signature: lit at the top of the glyphs, sinking into the
          deepest water at the bottom of the page */}
      <div className="footer-word" aria-hidden="true">
        nano
      </div>
    </footer>
  );
}

export default function Site() {
  const root = useReveal();

  return (
    <div ref={root} id="top">
      <PondHero />
      <Waterline />

      <main className="shell">
        <Band label="What I do" id="about">
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

          <div className="rules rise" style={{ marginTop: 'clamp(2.5rem, 6vh, 4rem)' }}>
            <div className="cells">
              {CAPABILITIES.map((c, i) => (
                <div className="cell" key={c.title}>
                  {c.figure}
                  <span className="eyebrow">
                    {String(i + 1).padStart(2, '0')} / 03
                  </span>
                  <h3 className="cell-title">{c.title}</h3>
                  <p className="cell-body">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Band>

        <Band label="Selected work" id="work">
          <div className="split">
            <div>
              <h2 className="statement rise">
                Things I <i>designed</i>, built, and had to fix.
              </h2>
              <p className="split-note rise">
                Ordered by recency. Each case gives the result first — the
                number that proves it worked — then how it was measured.
              </p>
            </div>
          </div>

          {WORK.map((w, i) => (
            <div className="rules case rise" key={i}>
              <div className="cells" style={{ '--cols': 2 } as React.CSSProperties}>
                <div className="cell">
                  <span className="eyebrow">
                    Case {String(i + 1).padStart(2, '0')} · {w.tag}
                  </span>
                  <h3 className="cell-title">{w.title}</h3>
                  <p className="cell-body">{w.blurb}</p>
                  {w.spec ? (
                    <dl className="spec">
                      {w.spec.map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>

                <div className="cell case-result">
                  {w.result ? (
                    <div className="result">
                      {w.result.delta ? (
                        <span className="result-delta">{w.result.delta}</span>
                      ) : null}
                      <strong className="result-value">{w.result.value}</strong>
                      <p className="result-caption">{w.result.caption}</p>
                    </div>
                  ) : null}
                  <span className="case-meta">{w.meta}</span>
                  {w.href ? (
                    <a
                      className="chamfer"
                      href={w.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="glyph">↳</span> View case
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </Band>

        <Band label="Where I've worked" id="experience">
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

        <Band label="Reach" id="reach">
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

      </main>

      <Footer />
    </div>
  );
}
