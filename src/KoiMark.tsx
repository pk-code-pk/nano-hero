// The koi silhouette, traced from koiBodyShape() in Koi.tsx so the mark is the
// same fish that swims in the hero. Three.js shapes are Y-up and SVG is Y-down,
// so every y is negated; otherwise the control points are identical.
export default function KoiMark({ className = 'koi' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="-58 -18 116 36"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M54 0
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
           Z"
      />
    </svg>
  );
}
