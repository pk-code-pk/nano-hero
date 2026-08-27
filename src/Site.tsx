// Site below the hero, in the sstr.tech register (see docs/reference):
// uppercase grotesk set solid, hard rules, one orange accent, panels
// alternating paper and dark. The hero itself is unchanged.
import { useEffect, useRef } from 'react';
import PondHero from './PondHero';
import KoiMark from './KoiMark';
import Nav from './Nav';

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

// Each box names the role it comes from — the titles are Nano's own, so the
// claims are checkable rather than generic capability copy.
const CAPABILITIES: { title: string; body: string; figure: React.ReactNode }[] = [
  {
    title: 'Design',
    body: 'Design and CAD engineer at Give A Hand. Solid modelling, drawings, and the revisions that follow a build.',
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
    body: 'Manufacturing engineer co-op at Bevi, Boston. Fixturing, process documentation, and assembly support on the line.',
    figure: (
      <svg className="figure" viewBox="0 0 120 90" aria-hidden="true">
        <path d="M14 68h92M24 76h68" />
        <path d="M28 68V40l14-10h30l14 10v28" />
        <circle cx="57" cy="46" r="11" className="hot" />
      </svg>
    ),
  },
  {
    title: 'Research',
    body: 'Research assistant at the Kostas Research Institute and the Transformative Robotics Lab, Northeastern.',
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
        const root = document.documentElement;
        root.style.setProperty(
          '--p',
          Math.min(1, Math.max(0, scrollY / max)).toFixed(4)
        );
        // hero hand-off: the video lags the page as you scroll past it. Capped
        // at 8% of the viewport, which is what .pond-video's extra height can
        // absorb without the video's own edge coming into frame.
        root.style.setProperty(
          '--hero-shift',
          Math.min(innerHeight * 0.08, scrollY * 0.16).toFixed(1)
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
          <KoiMark className="koi koi--accent footer-koi" />
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
      <Nav />
      <PondHero />

      {/* ---- about ---- */}
      <section
        className="panel panel--d1" id="about"
        style={{ '--water-img': "url(/water-1.jpg)", '--water-op': 0.14 } as React.CSSProperties}
      >
        <div className="wrap">
          <span className="eyebrow rise">
            <KoiMark />
            About
          </span>
          <h1 className="lockup rise">
            <span className="mask">
              <span className="lockup-given">Nano</span>
            </span>
            <span className="mask">
              <span className="lockup-family">Eiamwattanasin</span>
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

      {/* ---- experience ---- */}
      <section
        className="panel panel--d3" id="experience"
        style={{ '--water-img': "url(/water-3.jpg)", '--water-op': 0.07 } as React.CSSProperties}
      >
        <div className="wrap">
          <span className="eyebrow rise">
            <KoiMark />
            Experience
          </span>
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
      <section
        className="panel panel--d4" id="contact"
        style={{ '--water-img': "url(/water-4.jpg)", '--water-op': 0.07 } as React.CSSProperties}
      >
        <div className="wrap">
          <span className="eyebrow rise">
            <KoiMark />
            Contact
          </span>
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
