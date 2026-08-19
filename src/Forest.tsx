// Night-forest backdrop: layered ridge silhouettes + giant trunks,
// generated deterministically so every load matches.

const W = 1600;
const H = 900;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

/** Jagged conifer treeline: teeth of varying height along a base line. */
function ridge(seed: number, baseY: number, amp: number): string {
  const rand = rng(seed);
  let d = `M -40 ${H + 40} L -40 ${baseY}`;
  let x = -40;
  while (x < W + 40) {
    const toothW = 22 + rand() * 46;
    const toothH = amp * (0.35 + rand() * 0.65);
    const mid = x + toothW / 2;
    // slightly off-center peak so trees don't look stamped
    const peak = mid + (rand() - 0.5) * toothW * 0.4;
    d += ` L ${peak.toFixed(1)} ${(baseY - toothH).toFixed(1)}`;
    x += toothW;
    d += ` L ${x.toFixed(1)} ${(baseY - rand() * amp * 0.18).toFixed(1)}`;
  }
  return d + ` L ${W + 40} ${H + 40} Z`;
}

/** One giant curved trunk with a couple of branch stubs. */
function trunk(seed: number, baseX: number, w: number, lean: number): string {
  const rand = rng(seed);
  const topX = baseX + lean;
  const cpX = baseX + lean * 0.3 + (rand() - 0.5) * 40;
  const d = [
    `M ${baseX - w / 2} ${H + 20}`,
    `C ${cpX - w * 0.42} ${H * 0.62}, ${topX - w * 0.34} ${H * 0.3}, ${topX - w * 0.26} -20`,
    `L ${topX + w * 0.26} -20`,
    `C ${topX + w * 0.34} ${H * 0.34}, ${cpX + w * 0.44} ${H * 0.66}, ${baseX + w / 2} ${H + 20}`,
    'Z',
  ].join(' ');
  // branch stubs
  const branches: string[] = [];
  for (let i = 0; i < 2; i++) {
    const t = 0.22 + rand() * 0.3 + i * 0.18;
    const y = H * t;
    const x = baseX + lean * (1 - t) * 0.9;
    const dir = rand() > 0.5 ? 1 : -1;
    const len = 90 + rand() * 130;
    const droop = 30 + rand() * 50;
    branches.push(
      `M ${x} ${y} C ${x + dir * len * 0.4} ${y - droop * 0.6}, ${x + dir * len * 0.75} ${y - droop}, ${x + dir * len} ${y - droop * 0.7} ` +
        `C ${x + dir * len * 0.7} ${y - droop * 0.3}, ${x + dir * len * 0.4} ${y + 6}, ${x} ${y + w * 0.16} Z`,
    );
  }
  return d + ' ' + branches.join(' ');
}

const FAR = ridge(101, H * 0.62, 150);
const MID = ridge(202, H * 0.76, 210);
const NEAR = ridge(303, H * 0.94, 290);
const TRUNKS = [
  trunk(11, 110, 120, 40),
  trunk(22, 1500, 150, -55),
  trunk(33, 320, 60, -25),
  trunk(44, 1290, 70, 30),
];

export default function Forest() {
  return (
    <svg
      className="forest"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1b1b24" />
          <stop offset="55%" stopColor="#131318" />
          <stop offset="100%" stopColor="#0d0d11" />
        </linearGradient>
        <radialGradient id="moon" cx="50%" cy="38%" r="42%">
          <stop offset="0%" stopColor="#2a2733" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#2a2733" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#101014" stopOpacity="0" />
          <stop offset="100%" stopColor="#08080b" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      <rect width={W} height={H} fill="url(#moon)" />
      <path d={FAR} fill="#15151c" />
      <path d={MID} fill="#0f0f15" />
      {TRUNKS.map((d, i) => (
        <path key={i} d={d} fill="#0a0a0f" />
      ))}
      <path d={NEAR} fill="#0a0a0e" />
      <rect y={H * 0.7} width={W} height={H * 0.3} fill="url(#ground-fog)" />
    </svg>
  );
}
