// Actual koi, seen from above: beziered body + forked caudal fin + pectoral
// fins, with kohaku/showa patch overlays. Swimming = spine sine wave injected
// into the vertex shader (amplitude grows toward the tail), fish wander on
// lissajous paths facing their direction of travel.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sceneTime } from './renderClock';

// ---- geometry: fish points +x (nose at +54, tail fork at -56) ----
function koiBodyShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(54, 0);
  s.bezierCurveTo(50, 10, 34, 15, 18, 14);   // head -> shoulder
  s.bezierCurveTo(-2, 12, -18, 7, -28, 3);   // taper to peduncle
  s.lineTo(-32, 2);
  // caudal fin, upper lobe
  s.bezierCurveTo(-44, 10, -52, 16, -56, 13);
  s.bezierCurveTo(-50, 6, -48, 2, -49, 0);
  // lower lobe
  s.bezierCurveTo(-48, -2, -50, -6, -56, -13);
  s.bezierCurveTo(-52, -16, -44, -10, -32, -2);
  s.lineTo(-28, -3);
  s.bezierCurveTo(-18, -7, -2, -12, 18, -14);
  s.bezierCurveTo(34, -15, 50, -10, 54, 0);  // back to nose
  return s;
}

function pectoralShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-6, 8, -16, 12, -22, 10);
  s.bezierCurveTo(-16, 4, -8, 0, 0, -2);
  return s;
}

function patchShape(w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absellipse(0, 0, w, h, 0, Math.PI * 2, false, 0);
  return s;
}

const EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 6,
  bevelEnabled: true,
  bevelThickness: 1.5,
  bevelSize: 1.5,
  bevelSegments: 2,
  curveSegments: 10,
};
const PATCH_EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 1.5,
  bevelEnabled: false,
  curveSegments: 8,
};

// ---- spine-wave material: shared uniforms per fish ----
interface SwimUniforms {
  uTime: { value: number };
  uPhase: { value: number };
  uAmp: { value: number };
}

function swimMaterial(color: string, u: SwimUniforms) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = u.uTime;
    sh.uniforms.uPhase = u.uPhase;
    sh.uniforms.uAmp = u.uAmp;
    sh.vertexShader =
      'uniform float uTime;\nuniform float uPhase;\nuniform float uAmp;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float env = smoothstep(34.0, -56.0, position.x);
          transformed.y += sin(position.x * 0.06 - uTime * 6.0 + uPhase) * uAmp * env;
        }`,
      );
  };
  return mat;
}

// ---- one koi: body + fins + patches, all bending together ----
interface KoiSpec {
  body: string;
  patches: { color: string; x: number; y: number; w: number; h: number }[];
  scale: number;
  z: number;
  ax: number; // lissajous amplitudes
  ay: number;
  wx: number; // lissajous speeds
  wy: number;
  px: number; // phases
  py: number;
  amp: number; // tail swing
}

const KOI: KoiSpec[] = [
  { body: '#f4f1e8', patches: [{ color: '#d92b18', x: 24, y: 3, w: 14, h: 9 }, { color: '#e04b10', x: -6, y: -3, w: 16, h: 10 }], scale: 1.5, z: -90, ax: 500, ay: 240, wx: 0.11, wy: 0.17, px: 0.3, py: 1.8, amp: 5.5 },
  { body: '#ff7d2a', patches: [], scale: 1.15, z: -150, ax: 540, ay: 260, wx: 0.14, wy: 0.09, px: 2.2, py: 0.4, amp: 6 },
  { body: '#f4f1e8', patches: [{ color: '#1c1c1e', x: 12, y: -4, w: 12, h: 8 }, { color: '#d92b18', x: 32, y: 2, w: 10, h: 7 }], scale: 1.3, z: -210, ax: 470, ay: 220, wx: 0.09, wy: 0.13, px: 4.4, py: 3.0, amp: 5 },
  { body: '#d92b18', patches: [{ color: '#f4f1e8', x: 0, y: 4, w: 13, h: 8 }], scale: 1.0, z: -120, ax: 520, ay: 250, wx: 0.16, wy: 0.11, px: 1.1, py: 5.2, amp: 6.5 },
  { body: '#f0c33c', patches: [], scale: 0.9, z: -260, ax: 430, ay: 230, wx: 0.12, wy: 0.19, px: 5.6, py: 2.4, amp: 6 },
  { body: '#f4f1e8', patches: [{ color: '#d92b18', x: 8, y: 0, w: 20, h: 11 }], scale: 1.2, z: -320, ax: 560, ay: 270, wx: 0.08, wy: 0.15, px: 3.7, py: 0.9, amp: 5 },
  { body: '#ff7d2a', patches: [{ color: '#1c1c1e', x: 20, y: 5, w: 9, h: 6 }], scale: 0.8, z: -180, ax: 480, ay: 210, wx: 0.18, wy: 0.12, px: 0.9, py: 4.1, amp: 7 },
  { body: '#f4f1e8', patches: [{ color: '#e04b10', x: -14, y: 2, w: 12, h: 8 }], scale: 0.7, z: -240, ax: 510, ay: 240, wx: 0.15, wy: 0.2, px: 2.9, py: 1.3, amp: 7 },
  { body: '#f4f1e8', patches: [{ color: '#d92b18', x: 18, y: -2, w: 15, h: 9 }, { color: '#d92b18', x: -16, y: 3, w: 10, h: 7 }], scale: 1.1, z: -140, ax: 460, ay: 280, wx: 0.13, wy: 0.07, px: 5.0, py: 3.9, amp: 5.5 },
  { body: '#e8632c', patches: [{ color: '#f4f1e8', x: 10, y: 4, w: 11, h: 7 }], scale: 0.95, z: -300, ax: 540, ay: 200, wx: 0.1, wy: 0.16, px: 1.7, py: 0.2, amp: 6 },
  { body: '#1c1c1e', patches: [{ color: '#ff7d2a', x: 14, y: 0, w: 13, h: 8 }], scale: 1.05, z: -200, ax: 500, ay: 260, wx: 0.17, wy: 0.1, px: 3.3, py: 5.8, amp: 6.5 },
  { body: '#f4f1e8', patches: [], scale: 0.6, z: -160, ax: 420, ay: 300, wx: 0.2, wy: 0.14, px: 0.6, py: 2.7, amp: 8 },
  { body: '#f0c33c', patches: [{ color: '#d92b18', x: 22, y: -3, w: 9, h: 6 }], scale: 1.25, z: -350, ax: 570, ay: 250, wx: 0.07, wy: 0.12, px: 4.8, py: 1.9, amp: 5 },
];

function OneKoi({ spec, reduced }: { spec: KoiSpec; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  // persistent heading: a fish carries its orientation between frames, it
  // doesn't re-derive it from instantaneous velocity every frame
  const heading = useRef<number | null>(null);
  const bank = useRef(0);
  const { uniforms, parts } = useMemo(() => {
    const uniforms: SwimUniforms = {
      uTime: { value: 0 },
      uPhase: { value: spec.px * 2 },
      uAmp: { value: spec.amp },
    };
    const body = new THREE.ExtrudeGeometry(koiBodyShape(), EXTRUDE);
    const fin = new THREE.ExtrudeGeometry(pectoralShape(), PATCH_EXTRUDE);
    const parts = {
      body,
      fin,
      bodyMat: swimMaterial(spec.body, uniforms),
      finMat: swimMaterial(spec.body, uniforms),
      patches: spec.patches.map((p) => ({
        geo: new THREE.ExtrudeGeometry(patchShape(p.w, p.h), PATCH_EXTRUDE),
        mat: swimMaterial(p.color, uniforms),
        x: p.x,
        y: p.y,
      })),
    };
    return { uniforms, parts };
  }, [spec]);

  useFrame(({ clock }, delta) => {
    const t = sceneTime(clock.getElapsedTime(), reduced);
    uniforms.uTime.value = t;
    const g = group.current;
    if (!g) return;
    const x = Math.sin(t * spec.wx + spec.px) * spec.ax;
    const y = Math.sin(t * spec.wy + spec.py) * spec.ay;
    const dx = Math.cos(t * spec.wx + spec.px) * spec.ax * spec.wx;
    const dy = Math.cos(t * spec.wy + spec.py) * spec.ay * spec.wy;
    g.position.set(x, y, spec.z);

    const target = Math.atan2(dy, dx);
    const cur = heading.current ?? target;
    // shortest way round, so crossing +-PI doesn't spin the long way
    const diff = Math.atan2(Math.sin(target - cur), Math.cos(target - cur));
    // ease toward the target, but never faster than a fish can actually turn.
    // this is what removes the snap at the path cusps, where velocity reverses
    // between one frame and the next
    const dt = Math.min(delta, 0.05);
    const maxTurn = 1.5 * dt;
    const step = THREE.MathUtils.clamp(diff * Math.min(1, dt * 2.6), -maxTurn, maxTurn);
    heading.current = cur + step;
    g.rotation.z = heading.current;

    // lean into the turn: rotating about the body's long axis shows a little
    // thickness mid-turn instead of staying a flat cutout
    const rate = dt > 0 ? step / dt : 0;
    bank.current += (THREE.MathUtils.clamp(-rate * 0.42, -0.65, 0.65) - bank.current) * Math.min(1, dt * 4);
    g.rotation.y = bank.current;

    g.scale.setScalar(spec.scale);
  });

  // the spine-wave shader moves vertices outside the geometry's bounds, so
  // three.js culls these against the wrong sphere — fish pop out at the frame
  // edges, worst in portrait where the FOV is narrow
  useEffect(() => {
    group.current?.traverse((o) => {
      o.frustumCulled = false;
    });
  }, []);

  return (
    <group ref={group}>
      <mesh geometry={parts.body} material={parts.bodyMat} />
      {/* pectoral fins */}
      <mesh geometry={parts.fin} material={parts.finMat} position={[22, 14, 3]} rotation={[0, 0, 0.5]} />
      <mesh geometry={parts.fin} material={parts.finMat} position={[22, -14, 3]} rotation={[0, 0, -0.5]} scale={[1, -1, 1]} />
      {/* color patches ride on top of the back */}
      {parts.patches.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={p.mat} position={[p.x, p.y, 6.5]} />
      ))}
    </group>
  );
}

function lilyPadShape(r: number, notch: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  const a0 = notch;
  const a1 = notch + Math.PI * 2 - 0.55; // classic wedge cut
  s.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
  s.absarc(0, 0, r, a0, a1, false);
  s.lineTo(0, 0);
  return s;
}

const PADS = [
  { x: -290, y: 160, r: 78, notch: 0.7, color: '#1fd455', z: -40, spin: 0.05 },
  { x: 310, y: 170, r: 62, notch: 2.4, color: '#25e060', z: -46, spin: -0.04 },
  { x: -320, y: -145, r: 88, notch: 4.1, color: '#1bc74e', z: -38, spin: 0.03 },
  { x: 280, y: -165, r: 55, notch: 1.2, color: '#1fd455', z: -52, spin: -0.06 },
  { x: 100, y: 185, r: 48, notch: 5.3, color: '#25e060', z: -44, spin: 0.07 },
  { x: -120, y: -185, r: 68, notch: 3.0, color: '#1bc74e', z: -42, spin: -0.03 },
  { x: 360, y: 25, r: 44, notch: 0.2, color: '#1fd455', z: -50, spin: 0.05 },
];

export function LilyPads({ reduced }: { reduced: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const pads = useMemo(
    () =>
      PADS.map((p) => ({
        ...p,
        geo: new THREE.ExtrudeGeometry(lilyPadShape(p.r, p.notch), {
          depth: 3,
          bevelEnabled: true,
          bevelThickness: 1,
          bevelSize: 1.5,
          bevelSegments: 2,
          curveSegments: 24,
        }),
        mat: new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8 }),
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = sceneTime(clock.getElapsedTime(), reduced);
    for (let i = 0; i < pads.length; i++) {
      const mesh = refs.current[i];
      if (!mesh) continue;
      const p = pads[i];
      mesh.position.set(
        p.x + Math.sin(t * 0.18 + i * 2.1) * 14,
        p.y + Math.cos(t * 0.14 + i * 1.3) * 10,
        p.z,
      );
      mesh.rotation.z = i + t * p.spin;
    }
  });
  return (
    <group>
      {pads.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          geometry={p.geo}
          material={p.mat}
        />
      ))}
    </group>
  );
}

// ---- seaweed: tapered wavy blades, root-anchored sway ----
function bladeShape(len: number, w: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  // left edge with gentle lobes
  s.bezierCurveTo(-w * 0.9, len * 0.25, -w * 0.15, len * 0.4, -w * 0.55, len * 0.62);
  s.bezierCurveTo(-w * 0.8, len * 0.78, -w * 0.2, len * 0.9, 0, len);
  // right edge mirrored-ish
  s.bezierCurveTo(w * 0.25, len * 0.88, w * 0.75, len * 0.74, w * 0.5, len * 0.6);
  s.bezierCurveTo(w * 0.2, len * 0.42, w * 0.85, len * 0.28, w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
}

interface WeedUniforms {
  uTime: { value: number };
  uPhase: { value: number };
  uAmp: { value: number };
  uLen: { value: number };
}

function weedMaterial(color: string, u: WeedUniforms) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = u.uTime;
    sh.uniforms.uPhase = u.uPhase;
    sh.uniforms.uAmp = u.uAmp;
    sh.uniforms.uLen = u.uLen;
    sh.vertexShader =
      'uniform float uTime;\nuniform float uPhase;\nuniform float uAmp;\nuniform float uLen;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float h = clamp(position.y / uLen, 0.0, 1.0);
          float k = pow(h, 1.5);
          transformed.x += (sin(uTime * 0.9 + position.y * 0.018 + uPhase) * 0.7
                          + sin(uTime * 1.7 + position.y * 0.011 + uPhase * 2.3) * 0.3)
                          * uAmp * k;
        }`,
      );
  };
  return mat;
}

const WEED_CLUMPS = [
  { x: -360, blades: 4, z: -140 },
  { x: -230, blades: 3, z: -300 },
  { x: 140, blades: 3, z: -260 },
  { x: 290, blades: 5, z: -120 },
  { x: 385, blades: 3, z: -330 },
];
const WEED_GREENS = ['#17d15c', '#12b04c', '#0e8f3a'];

export function Seaweed({ reduced }: { reduced: boolean }) {
  const items = useMemo(() => {
    const rand = (seed: number) => {
      let a = seed >>> 0;
      return () => ((a = (a * 1664525 + 1013904223) >>> 0), a / 4294967296);
    };
    const r = rand(0x5eaeed);
    const out: {
      geo: THREE.ExtrudeGeometry;
      mat: THREE.MeshStandardMaterial;
      u: WeedUniforms;
      x: number;
      z: number;
      lean: number;
    }[] = [];
    for (const c of WEED_CLUMPS) {
      for (let b = 0; b < c.blades; b++) {
        const len = 70 + r() * 85;
        const w = 9 + r() * 8;
        const u: WeedUniforms = {
          uTime: { value: 0 },
          uPhase: { value: r() * Math.PI * 2 },
          uAmp: { value: 14 + r() * 16 },
          uLen: { value: len },
        };
        out.push({
          geo: new THREE.ExtrudeGeometry(bladeShape(len, w), {
            depth: 3,
            bevelEnabled: false,
            curveSegments: 14,
          }),
          mat: weedMaterial(WEED_GREENS[(b + out.length) % 3], u),
          u,
          x: c.x + (b - c.blades / 2) * (14 + r() * 10),
          z: c.z + b * 4,
          lean: (r() - 0.5) * 0.3,
        });
      }
    }
    return out;
  }, []);
  useFrame(({ clock }) => {
    const t = sceneTime(clock.getElapsedTime(), reduced);
    for (const it of items) it.u.uTime.value = t;
  });
  return (
    <group>
      {items.map((it, i) => (
        <mesh
          key={i}
          geometry={it.geo}
          material={it.mat}
          position={[it.x, -265, it.z]}
          rotation={[0, 0, it.lean]}
        />
      ))}
    </group>
  );
}

const BUBBLE_COUNT = 22;

function Bubbles({ reduced }: { reduced: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const specs = useMemo(() => {
    const rand = (seed: number) => {
      let a = seed >>> 0;
      return () => ((a = (a * 1664525 + 1013904223) >>> 0), a / 4294967296);
    };
    const r = rand(0xb0bb1e);
    return Array.from({ length: BUBBLE_COUNT }, () => ({
      x: (r() - 0.5) * 1150,
      r: 2.5 + r() * 6,
      speed: 28 + r() * 55,
      wob: 1 + r() * 2.4,
      wobAmp: 6 + r() * 14,
      phase: r() * 100,
      z: -30 - r() * 380,
    }));
  }, []);
  const geo = useMemo(() => new THREE.CircleGeometry(1, 12), []);
  // fog:false — bubbles sit ~1000 units out, and fogging them toward the dark
  // fog colour made them read darker than the water they float in. Additive so
  // they always come out brighter than whatever is behind them.
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        // additive on bright water clips toward white, so the tint has to
        // start well into the blues to survive the sum
        color: '#8fd0ff',
        fog: false,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  useFrame(({ clock }) => {
    const t = sceneTime(clock.getElapsedTime(), reduced);
    for (let i = 0; i < specs.length; i++) {
      const mesh = refs.current[i];
      if (!mesh) continue;
      const b = specs[i];
      const span = 800;
      const y = ((b.phase * 37 + t * b.speed) % span) - span / 2;
      mesh.position.set(b.x + Math.sin(t * b.wob + b.phase) * b.wobAmp, y, b.z);
      // shrink as it nears the top, like it's about to pop
      const k = 1 - Math.max(0, (y - 240) / 160) * 0.6;
      mesh.scale.setScalar(b.r * k);
    }
  });
  return (
    <group>
      {specs.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          geometry={geo}
          material={mat}
        />
      ))}
    </group>
  );
}

export default function KoiSchool({ reduced }: { reduced: boolean }) {
  return (
    <group>
      {KOI.map((spec, i) => (
        <OneKoi key={i} spec={spec} reduced={reduced} />
      ))}
      <Bubbles reduced={reduced} />
    </group>
  );
}
