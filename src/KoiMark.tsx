// The koi silhouette, traced from koiBodyShape() in Koi.tsx so the mark is the
// same fish that swims in the hero. Three.js shapes are Y-up and SVG is Y-down,
// so every y is negated; otherwise the control points are identical.
//
// `fins` adds the pectoral from pectoralShape(), placed where OneKoi mounts it
// (x 22, y 14, rotated ~0.5rad). Without it the body alone reads as generic
// clip-art rather than a koi.
const BODY = `M54 0
  C50 -10 34 -15 18 -14
  C-2 -12 -18 -7 -28 -3
  L-32 -2
  C-44 -10 -52 -16 -56 -13
  C-50 -6 -48 -2 -49 0
  C-48 2 -50 6 -56 13
  C-52 16 -44 10 -32 2
  L-28 3
  C-18 7 -2 12 18 14
  C34 15 50 10 54 0
  Z`;

// pectoralShape(), y negated
const FIN = `M0 0 C-6 -8 -16 -12 -22 -10 C-16 -4 -8 0 0 2 Z`;

export default function KoiMark({
  className = 'koi',
  fins = false,
}: {
  className?: string;
  fins?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="-58 -22 116 44"
      aria-hidden="true"
      focusable="false"
    >
      <path d={BODY} />
      {fins ? (
        <>
          <path d={FIN} transform="translate(20 -11) rotate(-28)" opacity="0.8" />
          <path d={FIN} transform="translate(20 11) rotate(28) scale(1 -1)" opacity="0.8" />
        </>
      ) : null}
    </svg>
  );
}
