import { useCallback, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import AsciiHero from './AsciiHero';

export default function CurseMarkHero() {
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  const replay = useCallback(() => setRun((r) => r + 1), []);

  return (
    <section className="hero" key={run}>
      <AsciiHero reduced={!!reduced} />
      <button className="replay" type="button" onClick={replay}>
        Replay seal
      </button>
    </section>
  );
}
