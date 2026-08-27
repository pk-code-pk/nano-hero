// The pond: full-viewport ASCII koi hero. Renders only while it's on screen —
// at 6x supersample this is the most expensive thing on the page by far.
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import AsciiHero from './AsciiHero';

export default function PondHero() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [live, setLive] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setLive(entry.isIntersecting),
      { rootMargin: '120px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="pond" ref={ref} aria-label="Koi pond">
      <AsciiHero reduced={!!reduced} live={live} />
      <div className="pond-veil" aria-hidden="true" />
      <div className="pond-caption">
        <span className="pond-role">
          Mechanical engineering · Northeastern
        </span>
        <p className="pond-line">
          Robotics research at Northeastern. Six months on Bevi's
          manufacturing floor before that.
        </p>
      </div>
      <a className="pond-scroll" href="#work">
        <i />
        Descend
      </a>
    </section>
  );
}
