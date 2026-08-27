// Site below the hero, in the sstr.tech register (see docs/reference):
// uppercase grotesk set solid, hard rules, one orange accent, panels
// alternating paper and dark. The hero itself is unchanged.
import { useEffect, useRef } from 'react';
import PondHero from './PondHero';

type Role = {
  org: string;
  role: string;
  period: string;
  where?: string;
  now?: boolean;
};

// Reverse chronological. Dates carry real information, so this is a timeline.
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
  { org: 'Bevi', role: 'Manufacturing engineer co-op', period: 'Jan — Jun 2026', where: 'Boston, MA' },
  { org: 'Give A Hand', role: 'Design and CAD engineer', period: 'Sep 2025 —', now: true },
  { org: 'BKF Aerospace', role: 'Mechanical engineering intern', period: 'Jul — Aug 2024', where: 'Bangkok' },
  { org: 'TEDxYouth', role: 'Conference president', period: '2022 — 2024' },
  { org: 'Society of Women Engineers', role: 'Project lead', period: '2023 — 2024' },
];

// Real cases go here. Until then the section says so — placeholder specs that
// look like real data read as a filled-in template.
type Entry = {
  title: string;
  blurb: string;
  meta: string;
  tag: string;
  href?: string;
  result?: { value: string; caption: string; delta?: string };
  spec?: [string, string][];
};
const WORK: Entry[] = [];

const CAPABILITIES: { title: string; body: string; figure: React.ReactNode }[] = [
  {
    title: 'Design',
    body: 'Solid modelling, GD&T, tolerance stacks, DFM review.',
    figure: (
      <svg className="figure" viewBox="0 0 120 90" aria-hidden="true">
        <rect x="18" y="22" width="66" height="46" />
        <rect x="30" y="34" width="66" height="46" className="hot" />
        <path d="M18 14h66M18 10v8M84 10v8" />
      </svg>
    ),
  },
  {
    title: 'Manufacturing',
    body: 'Fixturing, process documentation, assembly and line support.',
    figure: (
      <svg className="figure" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M14 68h92M24 76h68" />
        <path d="M28 68V40l14-10h30l14 10v28" />
        <circle cx="57" cy="46" r="11" className="hot" />
      </svg>
    ),
  },
  {
    title: 'Test',
    body: 'Instrumented test rigs, data reduction, failure analysis.',
    figure: (
      <svg className="figure" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M20 74V16M20 74h84" />
        <path d="M26 66l20-14 18 8 20-30" className="hot" />
        <path d="M26 70l20-6 18 4 20-12" />
      </svg>
    ),
  },
];

const NAV: [string, string][] = [
  ['About', '#about'],
  ['Work', '#work'],
  ['Experience', '#experience'],
  ['Contact', '#contact'],
];

// TODO(nano): real URLs
const ELSEWHERE: [string, string][] = [
  ['LinkedIn', '#'],
  ['GitHub', '#'],
  ['Email', 'mailto:hello@example.com'],
];

function useReveal() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // scroll progress hairline
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = Math.max(1, document.body.scrollHeight - innerHeight);
        document.documentElement.style.setProperty(
          '--p',
          Math.min(1, Math.max(0, scrollY / max)).toFixed(4)
        );
      });
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    // each figure stroke gets its own dash length, so the ink-in finishes
    // together instead of guessing one length for every shape
    root.current?.querySelectorAll<SVGGeometryElement>('.figure *').forEach((n) => {
      if (typeof n.getTotalLength !== 'function') return;
      const len = Math.ceil(n.getTotalLength());
      if (len) n.style.setProperty('--len', String(len));
    });
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const targets = el.querySelectorAll('.rise');
    if (
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof IntersectionObserver === 'undefined'
    ) {
      targets.forEach((t) => t.classList.add('shown'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('shown');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '-6% 0px -10%' }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return root;
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-cols">
        <div className="footer-col footer-lede">
          <b className="footer-tick" aria-hidden="true" />
          {/* TODO(nano): what you're looking for, and when */}
          <p>Boston, Massachusetts.</p>
        </div>
        <div className="footer-col">
          <span className="eyebrow">Navigation</span>
          <ul>
            {NAV.map(([label, href]) => (
              <li key={label}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-col">
          <span className="eyebrow">Elsewhere</span>
          <ul>
            {ELSEWHERE.map(([label, href]) => (
              <li key={label}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-col footer-top">
          <span className="eyebrow">Back to top</span>
          <a href="#top" aria-label="Back to top">
            ↑
          </a>
        </div>
      </div>

      <div className="footer-meta">
        <span>Nano Eiamwattanasin — mechanical engineering</span>
        <span>Hero filmed from a live koi pond render</span>
      </div>

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
      <div className="progress" aria-hidden="true" />
      <PondHero />

      {/* ---- about ---- */}
      <section className="panel" id="about">
        <div className="wrap">
          <span className="eyebrow rise">About</span>
          <h1 className="display rise">
            <span className="mask">
              <span>Nano Eiamwattanasin</span>
            </span>
          </h1>
          <p className="lede rise">
            {/* TODO(nano): factual, but not your voice yet. */}
            Mechanical engineering student at Northeastern. Research assistant
            at the Kostas Research Institute and the Transformative Robotics
            Lab. Previously a manufacturing engineer co-op at Bevi in Boston,
            design and CAD engineer at Give A Hand, and a mechanical
            engineering intern at BKF Aerospace in Bangkok.
          </p>

          <div className="cells rise">
            {CAPABILITIES.map((c, i) => (
              <div
                className="cell"
                key={c.title}
                style={{ '--i': i } as React.CSSProperties}
              >
                {c.figure}
                <span className="eyebrow">
                  {String(i + 1).padStart(2, '0')} / 03
                </span>
                <h2 className="cell-title">{c.title}</h2>
                <p className="cell-body">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- work ---- */}
      <section className="panel panel--dark" id="work">
        <div className="wrap">
          <span className="eyebrow rise">Selected work</span>
          <h2 className="display display--sm rise">
            <span className="mask">
              <span>
                Cases <span className="dim">— not published yet</span>
              </span>
            </span>
          </h2>

          {WORK.length === 0 ? (
            <div className="cells rise" style={{ '--cols': 1 } as React.CSSProperties}>
              <div className="cell">
                <span className="eyebrow">Awaiting content</span>
                <p className="cell-body" style={{ marginTop: '0.9rem' }}>
                  Not published yet.
                </p>
              </div>
            </div>
          ) : (
            WORK.map((w, i) => (
              <div
                className="cells rise"
                key={i}
                style={{ '--cols': 2 } as React.CSSProperties}
              >
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
                <div className="cell">
                  {w.result ? (
                    <div className="result">
                      {w.result.delta ? (
                        <span className="result-delta">{w.result.delta}</span>
                      ) : null}
                      <strong className="result-value">{w.result.value}</strong>
                      <p className="result-caption">{w.result.caption}</p>
                    </div>
                  ) : null}
                  {w.href ? (
                    <a className="chamfer" href={w.href} target="_blank" rel="noreferrer">
                      ↳ View case
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ---- experience ---- */}
      <section className="panel" id="experience">
        <div className="wrap">
          <span className="eyebrow rise">Experience</span>
          <h2 className="display display--sm rise">
            <span className="mask">
              <span>
                Seven roles <span className="dim">— three current</span>
              </span>
            </span>
          </h2>

          <div className="rows rise">
            {EXPERIENCE.map((r, i) => (
              <div
                className="row rise"
                key={r.org}
                style={{ '--i': Math.min(i, 6) } as React.CSSProperties}
              >
                <span className="row-index">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  <h3 className="row-title">{r.org}</h3>
                  <p className="row-sub">
                    {r.role}
                    {r.where ? ` · ${r.where}` : ''}
                  </p>
                </span>
                <span className={r.now ? 'row-when now' : 'row-when'}>
                  {r.period}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- contact ---- */}
      <section className="panel panel--darker" id="contact">
        <div className="wrap">
          <span className="eyebrow rise">Contact</span>
          <h2 className="display rise">
            <span className="mask">
              <span>Get in touch</span>
            </span>
          </h2>
          <a className="chamfer rise" href="mailto:hello@example.com">
            ↳ Email
          </a>
          <div className="links rise">
            {ELSEWHERE.filter(([l]) => l !== 'Email').map(([label, href]) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
