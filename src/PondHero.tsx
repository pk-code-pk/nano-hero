// The pond, as a pre-rendered loop.
//
// The live WebGL version is still here behind ?live=1 — that's what the frame
// grabber captures. Everything else gets video: no shader cost, no driver
// texture limits, no 3fps phones.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// three.js is ~1MB of the bundle and only the live renderer needs it, so it
// loads on demand rather than shipping to every visitor
const AsciiHero = lazy(() => import('./AsciiHero'));

const LIVE =
  typeof window !== 'undefined' &&
  new URLSearchParams(location.search).has('live');

type Variant = { base: string; poster: string };

function pickVariant(): Variant {
  const base = innerWidth / innerHeight < 0.85 ? '/hero-port' : '/hero-land';
  return { base, poster: `${base}.jpg` };
}

export default function PondHero() {
  const reduced = useReducedMotion();
  const [variant, setVariant] = useState<Variant | null>(null);
  // reduced motion gets a still by default, with a control to start it anyway
  const [optedIn, setOptedIn] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (LIVE) return;
    const choose = () => setVariant(pickVariant());
    choose();
    addEventListener('resize', choose);
    return () => removeEventListener('resize', choose);
  }, []);

  useEffect(() => {
    if (optedIn) video.current?.play().catch(() => {});
  }, [optedIn]);

  const caption = (
    <>
      <div className="pond-veil" aria-hidden="true" />
      <div className="pond-caption">
        <span className="pond-role">
          Mechanical engineering · Northeastern
        </span>
        <p className="pond-line">
          Robotics research at Northeastern. Six months on Bevi's manufacturing
          floor before that.
        </p>
      </div>
      <a className="pond-scroll" href="#work">
        <i />
        Descend
      </a>
    </>
  );

  if (LIVE) {
    return (
      <section className="pond" aria-label="Koi pond">
        <Suspense fallback={null}>
          <AsciiHero reduced={!!reduced} />
        </Suspense>
        {caption}
      </section>
    );
  }

  const still = !!reduced && !optedIn;

  return (
    <section className="pond" aria-label="Koi pond">
      {variant ? (
        <video
          ref={video}
          className="pond-video"
          poster={variant.poster}
          autoPlay={!still}
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          key={variant.base}
        >
          {/* HEVC first: Safari picks it and it's the smallest at this
              quality. Then VP9 for Chrome/Firefox, then H.264 as the
              universal fallback. Both 10-bit encodes exist because 8-bit
              4:2:0 subsampling smears the thin red koi fins. */}
          <source
            src={`${variant.base}.hevc.mp4`}
            type='video/mp4; codecs="hvc1"'
          />
          <source src={`${variant.base}.webm`} type="video/webm" />
          <source src={`${variant.base}.mp4`} type="video/mp4" />
        </video>
      ) : null}

      {still ? (
        <button
          className="pond-play"
          type="button"
          onClick={() => setOptedIn(true)}
        >
          Play the pond
        </button>
      ) : null}

      {caption}
    </section>
  );
}
