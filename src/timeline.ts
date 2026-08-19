// Shared timeline (seconds) — the SVG sigil and the GL backdrop both read this.
export const SEAL_FADE = 0.9;
export const SPIN_DELAY = SEAL_FADE * 0.35;
export const SPIN_DUR = 2.6;
export const IGNITE_AT = SPIN_DELAY + SPIN_DUR - 0.7; // flash as the spin decelerates
export const SPREAD_AT = IGNITE_AT + 0.4;
export const SPREAD_DUR = 2.3;
export const BURN = 0.85; // per-mark ember -> ink
export const SETTLED_AT = SPREAD_AT + SPREAD_DUR + BURN + 0.4;
