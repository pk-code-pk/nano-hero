// Real 3D obsidian: flame marks extruded from the traced SVG paths,
// MeshPhysicalMaterial with clearcoat + studio lightformers, ember emissive
// during the burn, mouse parallax so the speculars travel.
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AsciiRenderer, Environment, Lightformer, Text3D, Center } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { FLAME_MARKS, SEAL_CENTER } from './sigil';
import { BURN, IGNITE_AT, SPIN_DELAY, SPIN_DUR, SPREAD_AT, SPREAD_DUR } from './timeline';

const EMBER = new THREE.Color('#ff6a10');

// procedural conchoidal ripple normal map, generated once
export function makeWaveNormal(f1: number, f2: number, f3: number, amp: number): THREE.CanvasTexture {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d')!;
  // integer cycle counts so the texture tiles seamlessly
  const k1 = Math.max(1, Math.round((f1 * N) / (2 * Math.PI)));
  const k2 = Math.max(1, Math.round((f2 * N) / (2 * Math.PI)));
  const k3 = Math.max(1, Math.round((f3 * N) / (2 * Math.PI)));
  const TAU = 2 * Math.PI;
  const h = new Float32Array(N * N);
  for (let py = 0; py < N; py++)
    for (let px = 0; px < N; px++) {
      const u = px / N;
      const v0 = py / N;
      let v = 0;
      v += Math.sin(u * TAU * k1 + Math.sin(v0 * TAU * 2) * 2.1) * 0.5;
      v += Math.sin((u + v0) * TAU * k2 + Math.cos(u * TAU * 3) * 1.6) * 0.35;
      v += Math.sin(v0 * TAU * k3 + Math.sin(u * TAU * 5) * 1.2) * 0.2;
      h[py * N + px] = v;
    }
  const img = x.createImageData(N, N);
  for (let py = 0; py < N; py++)
    for (let px = 0; px < N; px++) {
      const i = py * N + px;
      const dx = h[py * N + ((px + 1) % N)] - h[i];
      const dy = h[((py + 1) % N) * N + px] - h[i];
      img.data[i * 4] = 128 + dx * amp;
      img.data[i * 4 + 1] = 128 + dy * amp;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

let _normalTex: THREE.CanvasTexture | null = null;
function conchoidalNormal(): THREE.CanvasTexture {
  if (_normalTex) return _normalTex;
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d')!;
  // height field: layered smooth ripples
  const h = new Float32Array(N * N);
  for (let py = 0; py < N; py++)
    for (let px = 0; px < N; px++) {
      let v = 0;
      v += Math.sin(px * 0.055 + Math.sin(py * 0.03) * 2.1) * 0.5;
      v += Math.sin((px + py) * 0.028 + Math.cos(px * 0.017) * 3.0) * 0.35;
      v += Math.sin(py * 0.09 + Math.sin(px * 0.041) * 1.7) * 0.2;
      h[py * N + px] = v;
    }
  const img = x.createImageData(N, N);
  for (let py = 0; py < N; py++)
    for (let px = 0; px < N; px++) {
      const i = py * N + px;
      const dx = h[py * N + ((px + 1) % N)] - h[i];
      const dy = h[((py + 1) % N) * N + px] - h[i];
      img.data[i * 4] = 128 + dx * 90;
      img.data[i * 4 + 1] = 128 + dy * 90;
      img.data[i * 4 + 2] = 255;
      img.data[i * 4 + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  _normalTex = new THREE.CanvasTexture(c);
  _normalTex.wrapS = _normalTex.wrapT = THREE.RepeatWrapping;
  _normalTex.repeat.set(0.012, 0.012);
  return _normalTex;
}
const jitter = (id: number) => (((id * 2654435761) >>> 0) % 1000) / 1000;

const EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 6,
  bevelEnabled: true,
  bevelThickness: 2.2,
  bevelSize: 2.4,
  bevelSegments: 5,
  curveSegments: 8,
};

function obsidianMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#0a090d',
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.35,
    emissive: EMBER,
    emissiveIntensity: 0,
    normalMap: conchoidalNormal(),
    normalScale: new THREE.Vector2(0.55, 0.55),
  });
}

interface MarkMesh {
  geo: THREE.ExtrudeGeometry;
  mat: THREE.MeshPhysicalMaterial;
  x: number;
  y: number;
  z: number;
  delay: number;
}

function useMarkMeshes(): MarkMesh[] {
  return useMemo(() => {
    const loader = new SVGLoader();
    const out: MarkMesh[] = [];
    const keep = [...FLAME_MARKS]
      .sort((a, b) => b.dist - a.dist) // stable input order doesn't matter here
      .filter((m) => {
        const j = (((m.id * 2654435761) >>> 0) % 1000) / 1000;
        return j < 0.62; // thin the field ~40%
      });
    for (const m of keep) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${m.d}"/></svg>`;
      const paths = loader.parse(svg).paths;
      const shapes = paths.flatMap((p) => SVGLoader.createShapes(p));
      if (!shapes.length) continue;
      const geo = new THREE.ExtrudeGeometry(shapes, EXTRUDE);
      // conchoidal facets: displace front-cap vertices with smooth noise
      {
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i);
          if (z > EXTRUDE.depth! - 0.01) {
            const vx = pos.getX(i);
            const vy = pos.getY(i);
            const n =
              Math.sin(vx * 0.09 + Math.sin(vy * 0.07) * 2.0) +
              Math.sin((vx + vy) * 0.05) * 0.6;
            pos.setZ(i, z + n * 0.4);
          }
        }
        geo.computeVertexNormals();
      }
      // recenter geometry on the mark's own centroid so scale pops in place
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const cx = (bb.min.x + bb.max.x) / 2;
      const cy = (bb.min.y + bb.max.y) / 2;
      geo.translate(-cx, -cy, 0);
      out.push({
        geo,
        mat: obsidianMaterial(),
        x: cx - SEAL_CENTER.x,
        y: -(cy - SEAL_CENTER.y),
        z: -m.dist * 36,
        delay: SPREAD_AT + m.dist * SPREAD_DUR + jitter(m.id) * 0.4,
      });
    }
    return out;
  }, []);
}

function burnEnvelope(t: number, delay: number) {
  // 0 before ignition; spike hot, cool to black over BURN
  const a = t - delay;
  if (a <= 0) return { heat: 0, pop: 0 };
  const heat = a < 0.18 ? a / 0.18 : Math.max(0, 1 - (a - 0.18) / BURN);
  const pop = Math.min(1, a / 0.4);
  return { heat, pop: 1 - Math.pow(1 - pop, 3) };
}

function Field({ reduced }: { reduced: boolean }) {
  const meshes = useMarkMeshes();
  const group = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const { pointer } = useThree();

  useFrame(({ clock }) => {
    const t = reduced ? 1e3 : clock.getElapsedTime();
    for (let i = 0; i < meshes.length; i++) {
      const mesh = refs.current[i];
      if (!mesh) continue;
      const { heat, pop } = burnEnvelope(t, meshes[i].delay);
      const mat = meshes[i].mat;
      mat.emissiveIntensity = heat * 2.6;
      const s = (0.55 + 0.45 * pop) * 0.82;
      mesh.scale.setScalar(s);
      mesh.visible = pop > 0.001;
      // idle breath
      if (pop >= 1) {
        const j = jitter(i + 7);
        mesh.rotation.z = Math.sin(t * (1.1 + j * 0.9) + j * 9) * 0.03;
      }
    }
    // autonomous drift + cursor parallax: speculars travel on their own
    if (group.current && !reduced) {
      const swayY = 0.07 + Math.sin(t * 0.62) * 0.09 + Math.sin(t * 0.27) * 0.04;
      const swayX = -0.05 + Math.cos(t * 0.5) * 0.06;
      group.current.rotation.y +=
        (swayY + pointer.x * 0.16 - group.current.rotation.y) * 0.05;
      group.current.rotation.x +=
        (swayX - pointer.y * 0.12 - group.current.rotation.x) * 0.05;
    }
  });

  return (
    <group ref={group}>
      {meshes.map((m, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          geometry={m.geo}
          material={m.mat}
          position={[m.x, m.y, m.z]}
          castShadow
          receiveShadow
          visible={reduced}
          scale={reduced ? 0.82 : 0.55}
        />
      ))}
    </group>
  );
}

function Lettermark({ reduced }: { reduced: boolean }) {
  const mat = useMemo(() => obsidianMaterial(), []);
  const group = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.Mesh>(null);
  // same conchoidal facets as the marks, on the letter caps
  useLayoutEffect(() => {
    const mesh = textRef.current;
    if (!mesh) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      if (z > 13) {
        const vx = pos.getX(i);
        const vy = pos.getY(i);
        const n =
          Math.sin(vx * 0.09 + Math.sin(vy * 0.07) * 2.0) +
          Math.sin((vx + vy) * 0.05) * 0.6;
        pos.setZ(i, z + n * 0.4);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }, []);
  useFrame(({ clock }) => {
    const t = reduced ? 1e3 : clock.getElapsedTime();
    // fade-up entrance
    const e = Math.min(1, Math.max(0, (t - SPIN_DELAY) / SPIN_DUR));
    const s = 0.86 + 0.14 * (1 - Math.pow(1 - e, 3));
    group.current?.scale.setScalar(s);
    // ember flare at ignite
    const a = t - IGNITE_AT;
    const heat = a > 0 ? (a < 0.25 ? a / 0.25 : Math.max(0, 1 - (a - 0.25) / 1.1)) : 0;
    // burn and cool exactly like the shards
    mat.emissiveIntensity = heat * 2.6;
    // gentle autonomous float so the letter speculars keep moving
    if (group.current && !reduced) {
      group.current.position.y = Math.sin(t * 0.5) * 4;
      group.current.rotation.y = Math.sin(t * 0.27) * 0.085;
      group.current.rotation.x = Math.cos(t * 0.22) * 0.05;
    }
  });
  return (
    <group ref={group}>
      <Center position={[0, 0, 10]}>
        <Text3D
          ref={textRef}
          castShadow
          receiveShadow
          font="/fonts/helvetiker_bold.typeface.json"
          size={36}
          height={6}
          bevelEnabled
          bevelThickness={1.0}
          bevelSize={0.8}
          bevelSegments={4}
          curveSegments={8}
          material={mat}
        >
          emmanuel
        </Text3D>
      </Center>
    </group>
  );
}

export default function ObsidianField({ reduced }: { reduced: boolean }) {
  return (
    <Canvas
      className="obsidian-field"
      shadows
      camera={{ position: [0, 0, 1050], fov: 36, near: 10, far: 7000 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      resize={{ scroll: false }}
      onCreated={({ gl, camera, size }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        // fit ~675 world units of height in view
        const cam = camera as THREE.PerspectiveCamera;
        const dist = 675 / 2 / Math.tan((cam.fov * Math.PI) / 360);
        cam.position.set(0, 0, dist);
        cam.lookAt(0, 0, 0);
        cam.updateProjectionMatrix();
        void size;
      }}
    >
      {/* studio: cool top strip, warm ember side, faint fill */}
      <Environment resolution={256}>
        <Lightformer
          intensity={2.6}
          position={[0, 4, 6]}
          rotation-x={-Math.PI / 4}
          scale={[10, 1.6, 1]}
          color="#dfe6ff"
        />
        <Lightformer
          intensity={2.2}
          position={[-6, -1, 4]}
          rotation-y={Math.PI / 5}
          scale={[3, 5, 1]}
          color="#ff7a18"
        />
        <Lightformer
          intensity={0.35}
          position={[1, 1, 9]}
          scale={[14, 8, 1]}
          color="#aab2cc"
        />
        <Lightformer
          intensity={0.5}
          position={[6, -3, 3]}
          rotation-y={-Math.PI / 5}
          scale={[4, 4, 1]}
          color="#8a2a4a"
        />
      </Environment>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[260, 420, 500]}
        intensity={0.85}
        color="#dfe4f5"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-700}
        shadow-camera-right={700}
        shadow-camera-top={450}
        shadow-camera-bottom={-450}
        shadow-camera-far={2200}
        shadow-bias={-0.0004}
      />
      <Field reduced={reduced} />
      <Lettermark reduced={reduced} />
      <AsciiRenderer
        fgColor="#ff7a18"
        bgColor="#0a0a0d"
        characters=" .:-=+*#%@"
        resolution={0.18}
      />
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.18} darkness={0.78} />
        <Noise premultiply opacity={0.35} />
      </EffectComposer>
    </Canvas>
  );
}
