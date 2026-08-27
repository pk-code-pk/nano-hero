// One time source for the whole scene.
//
// Normally this is just the r3f clock. In capture mode the frame grabber sets
// an exact timestamp per frame, so the offline render is deterministic and
// evenly spaced instead of depending on how long each frame happened to take.
declare global {
  interface Window {
    __captureTime?: number;
    // set after each present so the grabber can wait for the exact frame it
    // asked for, instead of hoping a couple of rAFs were enough
    __renderedTime?: number;
  }
}

export const CAPTURE =
  typeof window !== 'undefined' &&
  new URLSearchParams(location.search).has('capture');

export function sceneTime(elapsed: number, reduced = false): number {
  if (CAPTURE) return window.__captureTime ?? 0;
  // reduced motion slows the scene rather than freezing it — a dead-still hero
  // reads as broken, and iOS ships Reduce Motion on plenty of phones
  return reduced ? elapsed * 0.25 : elapsed;
}
