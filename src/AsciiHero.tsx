// Type-first ASCII hero: 3D wordmark + the traced curse-mark shards,
// rendered as live colored ASCII. meshNormalMaterial paints surfaces by
// orientation, so the glyph colors shift iridescent as everything moves.
import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import AsciiPass from './AsciiPass';
import * as THREE from 'three';
import KoiSchool from './Koi';
import Pond from './Pond';
import { CONFIG, useControls } from './asciiControls';
import { CAPTURE, sceneTime } from './renderClock';

// index 0 keeps the original iridescent normal material; the rest tint the
// same normal-driven gradient toward a chosen hue
// three stops each: shadow -> midtone -> highlight. The original violet look
// came from a ramp like this, not a single colour with shading on it.
// rim is per-preset: against bright water a hot rim erases the silhouette, so
// only ink (which reads dark-on-light anyway) keeps the strong lift.
type TextStyle = { stops: [string, string, string]; rim: number };

export const TEXT_COLORS: (TextStyle | null)[] = [
  null, // index 0 = untouched meshNormalMaterial
  // ink — unchanged
  { stops: ['#050a1c', '#1b2f6b', '#8fd8ff'], rim: 0.6 },
  // jade — pearl read as washed grey against bright cyan; green is the one
  // hue the pond doesn't already use, and it matches the lily pads
  { stops: ['#031410', '#128a5c', '#9df0b8'], rim: 0.34 },
  // ember — deeper burnt base than the old gold, which blew out at koi gain 4
  { stops: ['#240a01', '#c2610a', '#ffce7a'], rim: 0.32 },
  // koi — crimson with a near-black anchor, matched to the fish palette
  { stops: ['#1c0303', '#a81208', '#ff8a5c'], rim: 0.28 },
];

// Tinted iridescence: meshNormalMaterial's appeal is that colour tracks surface
// orientation, so every bevel and side face separates. This keeps that, but
// ramps it around one hue instead of the raw normal.
const TEXT_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vView;
  varying float vLocalY;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    // glyph height is ~110 units, so this lands roughly in -1..1
    vLocalY = position.y / 70.0;
    gl_Position = projectionMatrix * mv;
  }
`;

const TEXT_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vN;
  varying vec3 vView;
  varying float vLocalY;
  uniform vec3 uA; // shadow
  uniform vec3 uB; // midtone
  uniform vec3 uC; // highlight
  uniform float uRim;

  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(vView);

    // where along the ramp this fragment sits: surface orientation, plus a
    // slow top-to-bottom grade so the word reads as one gradient too
    float lam = clamp(dot(n, normalize(vec3(0.45, 0.65, 0.75))), 0.0, 1.0);
    float vert = clamp(vLocalY * 0.5 + 0.5, 0.0, 1.0);
    float t = clamp(lam * 0.68 + vert * 0.32, 0.0, 1.0);

    vec3 col = mix(uA, uB, smoothstep(0.0, 0.55, t));
    col = mix(col, uC, smoothstep(0.5, 1.0, t));

    // rim pushes bevels and side faces to the top of the ramp
    float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);
    col = mix(col, mix(uC, vec3(1.0), 0.4), fres * uRim);

    // iridescent wobble off the raw normal, same trick meshNormalMaterial uses
    vec3 irid = 0.5 + 0.5 * n;
    col *= 0.78 + 0.44 * irid;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Wordmark({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const { textRamp } = useControls();
  const style =
    TEXT_COLORS[Math.min(TEXT_COLORS.length - 1, Math.max(0, Math.round(textRamp)))];
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = sceneTime(clock.getElapsedTime(), reduced);
    group.current.rotation.y +=
      (Math.sin(t * 0.4) * 0.16 + pointer.x * 0.3 - group.current.rotation.y) *
      0.06;
    group.current.rotation.x +=
      (Math.cos(t * 0.33) * 0.08 - pointer.y * 0.2 - group.current.rotation.x) *
      0.06;
    group.current.position.y = Math.sin(t * 0.55) * 8;
  });
  return (
    <group ref={group}>
      <Center position={[0, 0, 60]}>
        <Text3D
          font="/fonts/helvetiker_bold.typeface.json"
          size={110}
          height={26}
          bevelEnabled
          bevelThickness={3}
          bevelSize={2.2}
          bevelSegments={3}
          curveSegments={8}
        >
          nano
          {style ? (
            <shaderMaterial
              key={style.stops.join()}
              vertexShader={TEXT_VERT}
              fragmentShader={TEXT_FRAG}
              uniforms={{
                uA: { value: new THREE.Color(style.stops[0]) },
                uB: { value: new THREE.Color(style.stops[1]) },
                uC: { value: new THREE.Color(style.stops[2]) },
                uRim: { value: style.rim },
              }}
            />
          ) : (
            <meshNormalMaterial />
          )}
        </Text3D>
      </Center>
    </group>
  );
}

// Vertical FOV is fixed, so a narrow portrait viewport crops the school hard
// at both edges. Pull back to keep the pond in frame.
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (CAPTURE) {
      // let the grabber choose framing per orientation: ?capture=1&camz=1500
      const q = new URLSearchParams(location.search).get('camz');
      camera.position.z = q ? Number(q) : CONFIG.camZ;
    } else {
      const narrow = Math.min(size.width, size.height) < 760;
      camera.position.z = CONFIG.camZ * (narrow ? 1.45 : 1);
    }
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export default function AsciiHero({
  reduced,
  live = true,
  dpr,
}: {
  reduced: boolean;
  live?: boolean;
  dpr?: number;
}) {
  return (
    <Canvas
      className="ascii-field"
      camera={{ position: [0, 0, CONFIG.camZ], fov: 46, near: 1, far: 6000 }}
      dpr={dpr ?? [1, 2]}
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      resize={{ scroll: false }}
      frameloop={live ? 'always' : 'never'}
    >
      <color attach="background" args={['#01060c']} />
      {/* distant koi fade into the water instead of all reading at one depth */}
      <fogExp2 attach="fog" args={['#02121e', 0.00042]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[200, 300, 400]} intensity={1.7} />
      <CameraFit />
      <Pond reduced={reduced} />
      <Wordmark reduced={reduced} />
      <KoiSchool reduced={reduced} />
      <AsciiPass />
    </Canvas>
  );
}
