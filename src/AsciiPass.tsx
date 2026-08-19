// GPU ASCII post-pass: renders the scene into a cell-resolution target,
// then a fullscreen shader stamps glyphs from a canvas-generated atlas,
// tinted by the scene color of each cell. No DOM — one draw call.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const CHARS = " .':-=+*#%@";
const CELL_W = 4;
const CELL_H = 7;

function makeAtlas(): THREE.CanvasTexture {
  const n = CHARS.length;
  const gw = 32;
  const gh = 56;
  const c = document.createElement('canvas');
  c.width = gw * n;
  c.height = gh;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff';
  x.font = `${gh * 0.82}px monospace`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    x.fillText(CHARS[i], i * gw + gw / 2, gh / 2 + 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform sampler2D uAtlas;
  uniform vec2 uGrid;      // cols, rows
  uniform float uCount;    // glyph count
  uniform float uT;
  uniform vec4 uRip[5];    // x, y (uv), start time, active

  void main() {
    vec2 cell = floor(vUv * uGrid);
    vec2 cellUv = (cell + 0.5) / uGrid;
    // click ripples: refraction rings displace what each glyph samples
    float aspect = uGrid.x / uGrid.y * (7.0 / 4.0);
    for (int i = 0; i < 5; i++) {
      if (uRip[i].w < 0.5) continue;
      float age = uT - uRip[i].z;
      if (age < 0.0 || age > 2.5) continue;
      vec2 d = (vUv - uRip[i].xy) * vec2(aspect, 1.0);
      float dist = length(d) + 1e-5;
      float r = age * 0.38;
      float band = exp(-pow((dist - r) * 14.0, 2.0));
      float fade = exp(-age * 1.6);
      cellUv += (d / dist) * band * fade * 0.035 * sin(dist * 70.0 - age * 12.0);
    }
    vec3 col = texture2D(uScene, cellUv).rgb;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float gi = min(floor(lum * uCount), uCount - 1.0);
    vec2 local = fract(vUv * uGrid);
    float glyph = texture2D(uAtlas, vec2((gi + local.x) / uCount, local.y)).r;
    // blue-dominant pixels (the wordmark) get the cyber-violet ramp;
    // everything else (koi whites/oranges/reds) passes through untouched
    vec3 outCol;
    if (col.b > col.r * 0.92 && col.b > col.g * 0.88) {
      vec3 c1 = vec3(0.16, 0.04, 0.38);
      vec3 c2 = vec3(0.28, 0.38, 1.00);
      vec3 c3 = vec3(0.50, 0.96, 1.00);
      outCol = mix(c1, c2, smoothstep(0.05, 0.55, lum));
      outCol = mix(outCol, c3, smoothstep(0.55, 0.95, lum));
      outCol *= min(lum * 1.7 + 0.35, 1.25);
    } else {
      vec3 tint = col / max(lum, 0.14);
      outCol = tint * min(lum * 1.6 + 0.3, 1.2);
    }
    // gamma lift: pulls dim glyphs out of the video-codec crush zone
    gl_FragColor = vec4(pow(outCol * glyph, vec3(0.8)), 1.0);
  }
`;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export default function AsciiPass() {
  const { size, gl } = useThree();
  const pending = useRef<{ x: number; y: number }[]>([]);
  const slot = useRef(0);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pending.current.push({
        x: (e.clientX - r.left) / r.width,
        y: 1 - (e.clientY - r.top) / r.height,
      });
    };
    el.addEventListener('pointerdown', onDown);
    return () => el.removeEventListener('pointerdown', onDown);
  }, [gl]);
  const cols = Math.max(4, Math.floor(size.width / CELL_W));
  const rows = Math.max(4, Math.floor(size.height / CELL_H));

  const rt = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(cols, rows, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    return t;
  }, [cols, rows]);

  const { quadScene, quadCam, material } = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uScene: { value: null },
        uAtlas: { value: makeAtlas() },
        uGrid: { value: new THREE.Vector2(1, 1) },
        uCount: { value: CHARS.length },
        uT: { value: 0 },
        uRip: {
          value: Array.from({ length: 5 }, () => new THREE.Vector4(0, 0, 0, 0)),
        },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { quadScene, quadCam, material };
  }, []);

  useFrame(({ scene, camera, clock }) => {
    material.uniforms.uScene.value = rt.texture;
    material.uniforms.uGrid.value.set(cols, rows);
    const t = clock.getElapsedTime();
    material.uniforms.uT.value = t;
    const rips = material.uniforms.uRip.value as THREE.Vector4[];
    while (pending.current.length) {
      const c = pending.current.shift()!;
      rips[slot.current % 5].set(c.x, c.y, t, 1);
      slot.current++;
    }
    gl.setRenderTarget(rt);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(quadScene, quadCam);
  }, 1);

  return null;
}
