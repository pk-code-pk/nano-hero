import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { IGNITE_AT, SETTLED_AT, SPREAD_AT, SPREAD_DUR } from './timeline';
import { FLAME_MARKS, SEAL_CENTER } from './sigil';

// must match the camera in CurseMarkHero.tsx
const VIEW_W = 1200;
const VIEW_H = 675;
// must match the per-mark delay jitter in CurseMarkHero.tsx
const markJitter = (id: number) => (((id * 2654435761) >>> 0) % 1000) / 1000;

// ---------- chakra haze: slow-swirling purple fbm noise ----------
const HAZE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const HAZE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uAspect;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.55;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= uAspect;
    float r = length(uv);

    // swirl: rotate by radius + time
    float ang = 0.55 * sin(uTime * 0.11) - r * 2.2 + uTime * 0.06;
    float c = cos(ang), s = sin(ang);
    vec2 suv = mat2(c, -s, s, c) * uv;

    float n = fbm(suv * 2.6 + vec2(0.0, uTime * 0.10));
    n = smoothstep(0.28, 0.82, n);

    // wisps hug the middle, fade at edges and dead-center (seal lives there)
    float ring = smoothstep(0.72, 0.28, r) * smoothstep(0.03, 0.16, r);

    vec3 purple = vec3(0.42, 0.16, 0.66);
    vec3 magenta = vec3(0.62, 0.20, 0.55);
    vec3 col = mix(purple, magenta, n) * n * ring * uIntensity * 1.5;

    gl_FragColor = vec4(col, n * ring * 0.32 * uIntensity);
  }
`;

function Haze() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uAspect: { value: 1 },
    }),
    [],
  );
  useFrame(({ clock }) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    const t = clock.getElapsedTime();
    u.uTime.value = t;
    u.uAspect.value = viewport.width / viewport.height;
    // silent before ignite, surge during the spread, settle to an idle simmer
    const surge = THREE.MathUtils.smoothstep(t, IGNITE_AT - 0.2, SPREAD_AT + 0.8);
    const idle = THREE.MathUtils.smoothstep(t, SETTLED_AT, SETTLED_AT + 2.0);
    u.uIntensity.value = surge * (1.0 - 0.75 * idle);
  });
  return (
    <mesh scale={[viewport.width / 2, viewport.height / 2, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={HAZE_VERT}
        fragmentShader={HAZE_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ---------- embers: additive points drifting up from the seal ----------
const EMBER_COUNT = 36;

const EMBER_VERT = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uAspect;
  uniform float uSpawn;
  varying float vHeat;
  varying float vFade;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float seed = aSeed;
    float life = 3.0 + hash(seed * 7.1) * 3.5;          // seconds per loop
    float born = hash(seed * 3.3) * life;
    float t = mod(uTime - born, life) / life;           // 0..1 through life

    // spawn disc around the seal (center of screen)
    float ang = hash(seed * 1.7) * 6.2831;
    float rad = 0.08 + hash(seed * 9.4) * 0.48;
    vec2 p0 = vec2(cos(ang) * rad / uAspect, sin(ang) * rad * 0.75);

    // rise + sideways wander
    float wob = sin(uTime * (1.2 + hash(seed) * 1.6) + seed * 20.0);
    vec2 p = p0 + vec2(wob * 0.045 / uAspect, t * (0.32 + hash(seed * 5.2) * 0.30));

    vHeat = hash(seed * 11.3);
    // fade in fast, out slow; gate by global spawn envelope
    vFade = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.55, 1.0, t)) * uSpawn;

    vec4 mv = modelViewMatrix * vec4(p * 2.0 - vec2(0.0, 0.55), 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.0 + hash(seed * 13.7) * 5.0) * (300.0 / -mv.z) * 0.01;
  }
`;

const EMBER_FRAG = /* glsl */ `
  precision highp float;
  varying float vHeat;
  varying float vFade;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float m = smoothstep(0.5, 0.05, length(d));
    vec3 hot = vec3(1.0, 0.82, 0.29);   // #FFD24A
    vec3 mid = vec3(1.0, 0.48, 0.09);   // #FF7A18
    vec3 col = mix(mid, hot, vHeat);
    gl_FragColor = vec4(col * m * vFade * 1.3, m * vFade * 0.9);
  }
`;

function Embers() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uSpawn: { value: 0 },
    }),
    [],
  );
  const seeds = useMemo(() => {
    const a = new Float32Array(EMBER_COUNT);
    for (let i = 0; i < EMBER_COUNT; i++) a[i] = i + 1;
    return a;
  }, []);
  const positions = useMemo(() => new Float32Array(EMBER_COUNT * 3), []);
  const { viewport } = useThree();
  useFrame(({ clock }) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    const t = clock.getElapsedTime();
    u.uTime.value = t;
    u.uAspect.value = viewport.width / viewport.height;
    const surge = THREE.MathUtils.smoothstep(t, SPREAD_AT - 0.2, SPREAD_AT + 1.2);
    const idle = THREE.MathUtils.smoothstep(t, SETTLED_AT, SETTLED_AT + 2.5);
    u.uSpawn.value = 0.35 * surge * (1.0 - 0.5 * idle);
  });
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={EMBER_VERT}
        fragmentShader={EMBER_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------- burst embers: sparks popping off each mark as it ignites ----------
const BURST_PER_MARK = 2;

const BURST_VERT = /* glsl */ `
  attribute float aSeed;
  attribute vec3 aMark;   // x,y: SVG offset from seal center; z: ignite time (s)
  uniform float uTime;
  uniform float uScale;   // world units per SVG unit (slice-fitted)
  varying float vHeat;
  varying float vFade;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    float seed = aSeed;
    float born = aMark.z + hash(seed * 4.7) * 0.22;
    float life = 0.8 + hash(seed * 7.9) * 0.9;
    float t = (uTime - born) / life;
    float alive = step(0.0, t) * step(t, 1.0);

    // start on the mark, kick outward from the seal + rise
    vec2 base = vec2(aMark.x, -aMark.y) * uScale;
    vec2 outDir = normalize(base + vec2(0.0001));
    float kick = 0.05 + hash(seed * 3.1) * 0.10;
    float ang = (hash(seed * 8.3) - 0.5) * 1.6;
    float c = cos(ang), sn = sin(ang);
    vec2 dir = mat2(c, -sn, sn, c) * outDir;
    vec2 p = base
      + dir * kick * t
      + vec2(sin((uTime + seed) * 6.0) * 0.012, t * t * 0.22);

    vHeat = hash(seed * 11.3);
    vFade = alive * smoothstep(0.0, 0.10, t) * (1.0 - smoothstep(0.45, 1.0, t));

    vec4 mv = modelViewMatrix * vec4(p, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
    float shrink = 1.0 - 0.6 * t;
    gl_PointSize = (2.0 + hash(seed * 13.7) * 5.0) * shrink * (300.0 / -mv.z) * 0.01;
  }
`;

const BURST_FRAG = /* glsl */ `
  precision highp float;
  varying float vHeat;
  varying float vFade;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float m = smoothstep(0.5, 0.05, length(d));
    vec3 hot = vec3(1.0, 0.82, 0.29);
    vec3 mid = vec3(1.0, 0.48, 0.09);
    vec3 col = mix(mid, hot, vHeat);
    gl_FragColor = vec4(col * m * vFade * 1.5, m * vFade);
  }
`;

function BurstEmbers() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uScale: { value: 0.003 } }),
    [],
  );
  const { seeds, markData, positions } = useMemo(() => {
    const n = FLAME_MARKS.length * BURST_PER_MARK;
    const seeds = new Float32Array(n);
    const markData = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const m = FLAME_MARKS[i % FLAME_MARKS.length];
      seeds[i] = i + 1;
      markData[i * 3] = m.cx - SEAL_CENTER.x;
      markData[i * 3 + 1] = m.cy - SEAL_CENTER.y;
      markData[i * 3 + 2] =
        SPREAD_AT + m.dist * SPREAD_DUR + markJitter(m.id) * 0.4;
    }
    return { seeds, markData, positions: new Float32Array(n * 3) };
  }, []);
  useFrame(({ clock }) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uTime.value = clock.getElapsedTime();
    const aspect = viewport.width / viewport.height;
    // slice fit: world height is 2 at z=0 with this camera
    u.uScale.value = Math.max((2 * aspect) / VIEW_W, 2 / VIEW_H);
  });
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
        <bufferAttribute attach="attributes-aMark" args={[markData, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={BURST_VERT}
        fragmentShader={BURST_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// RGB-split pulse synced to the ignition
function IgnitePulse() {
  const ref = useRef<{ offset: THREE.Vector2 } | null>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const k = Math.max(0, 1 - Math.abs(t - (IGNITE_AT + 0.12)) / 0.4);
    const o = 0.004 * k * k;
    ref.current?.offset?.set(o, o * 0.5);
  });
  return (
    <ChromaticAberration
      ref={ref as never}
      offset={new THREE.Vector2(0, 0) as never}
    />
  );
}

export default function FireBackdrop() {
  return (
    <Canvas
      className="backdrop"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 1], fov: 90 }}
      style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}
    >
      <Embers />
      <BurstEmbers />
      <EffectComposer>
        <IgnitePulse />
        <Bloom
          intensity={1.15}
          luminanceThreshold={0.18}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
