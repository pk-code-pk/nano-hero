// Bare hero for offline frame capture: no page chrome, no caption, and dpr
// pinned high since nothing here has to run in real time.
import AsciiHero from './AsciiHero';

export default function CaptureStage() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#01060c',
        overflow: 'hidden',
      }}
    >
      <AsciiHero reduced={false} live dpr={3} />
    </div>
  );
}
