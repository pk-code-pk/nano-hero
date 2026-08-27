// GPU ASCII post-pass: renders the scene into a cell-resolution target,
// then a fullscreen shader stamps glyphs from a canvas-generated atlas,
// tinted by the scene color of each cell. No DOM — one draw call.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from './asciiControls';

const CHARS = ".':-=+*#%@";
// glyph cell aspect. Absolute size comes from the `cell` control, measured in
// supersample px, so browser zoom no longer changes the look.
const CELL_ASPECT = 7 / 4;
// supersample budget: ss can ask for a huge target, so clamp the total pixel
// count before allocating. Edge limits come from the driver at runtime — a
// target wider than GL_MAX_TEXTURE_SIZE binds as a zero-size attachment and
// every draw into it fails.
const MAX_PIXELS = 36e6;
// the scene target is cols x rows, which at sub-pixel cell sizes runs far
// larger than the supersample target
const MAX_SCENE_PIXELS = 96e6;

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
  // heavier weight + a touch of blur: more ink per cell, softer edges so the
  // glyph mask never collapses to a hairline at 4x7
  x.font = `900 ${gh * 0.9}px monospace`;
  x.shadowColor = '#fff';
  x.shadowBlur = 1.6;
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
  uniform float uCellAspect; // cell height / cell width
  uniform float uRamp;     // luminance gamma before glyph pick
  uniform float uBase;     // ambient ink floor
  uniform float uFill;     // this cell's own colour, flat behind the glyph
  uniform float uSubject;  // gain on everything that isn't the wordmark

  void main() {
    vec2 cell = floor(vUv * uGrid);
    vec2 cellUv = (cell + 0.5) / uGrid;
    // click ripples: refraction rings displace what each glyph samples
    float aspect = uGrid.x / uGrid.y * uCellAspect;
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
    // ramp is gamma-bent so mid glyphs arrive early instead of everything
    // sitting in the bottom two rungs
    float ramp = pow(lum, uRamp);
    float gi = min(floor(ramp * uCount), uCount - 1.0);
    vec2 local = fract(vUv * uGrid);
    float glyph = texture2D(uAtlas, vec2((gi + local.x) / uCount, local.y)).r;
    // cell floor: unlit parts of a cell still carry a trace, so the field
    // reads as a woven grid rather than holes
    glyph = max(glyph, 0.10);
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
      // the koi live here, and this branch is capped lower than the wordmark
      // branch above — uSubject is what evens the two out
      vec3 tint = col / max(lum, 0.14);
      outCol = tint * min(lum * 1.6 + 0.3, 1.2) * uSubject;
    }
    // ambient ink: empty water still gets a dim glyph instead of pure black.
    // tinted cool so the field reads as water, not grey noise
    vec3 base = uBase * vec3(0.6, 1.0, 1.4);
    // fill adds this cell's own scene colour flat behind the glyph, so lit
    // cells aren't punched out by the mask
    vec3 lit = (outCol + base) * glyph + col * uFill;
    // gamma lift: pulls dim glyphs out of the video-codec crush zone
    gl_FragColor = vec4(pow(lit, vec3(0.8)), 1.0);
  }
`;

// Box-filter downsample: this is the half of the effect that browser zoom-out
// was providing for free. The glyph field is stamped into an oversized target,
// then averaged down here, which is what turns hard 1px glyph edges into the
// soft fine grain.
const DOWN_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uSrc;
  uniform vec2 uTexel;   // 1 / source size
  uniform float uSpread; // source px per destination px

  void main() {
    vec3 acc = vec3(0.0);
    for (int y = 0; y < 4; y++) {
      for (int x = 0; x < 4; x++) {
        vec2 o = (vec2(float(x), float(y)) - 1.5) * uTexel * uSpread * 0.5;
        acc += texture2D(uSrc, vUv + o).rgb;
      }
    }
    gl_FragColor = vec4(acc / 16.0, 1.0);
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
  const controls = useControls();
  const maxTex = gl.capabilities.maxTextureSize;
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
  // supersample target, clamped so a maxed-out ss slider can't ask for a
  // target the GPU refuses to allocate
  const { ssW, ssH } = useMemo(() => {
    let w = Math.max(8, Math.round(size.width * controls.ss));
    let h = Math.max(8, Math.round(size.height * controls.ss));
    const edge = Math.max(w, h);
    if (edge > maxTex) {
      const f = maxTex / edge;
      w = Math.round(w * f);
      h = Math.round(h * f);
    }
    const px = w * h;
    if (px > MAX_PIXELS) {
      const f = Math.sqrt(MAX_PIXELS / px);
      w = Math.round(w * f);
      h = Math.round(h * f);
    }
    return { ssW: w, ssH: h };
  }, [size.width, size.height, controls.ss, maxTex]);

  // glyph grid is measured in supersample px, so cell 1 + ss 4 == 1px cells
  // inside a 4x buffer, which is exactly the Chrome-at-25% configuration
  const cellW = Math.max(0.5, controls.cell);
  const cellH = cellW * CELL_ASPECT;
  const { cols, rows } = useMemo(() => {
    let c = Math.max(4, Math.floor(ssW / cellW));
    let r = Math.max(4, Math.floor(ssH / cellH));
    const edge = Math.max(c, r);
    if (edge > maxTex) {
      const f = maxTex / edge;
      c = Math.round(c * f);
      r = Math.round(r * f);
    }
    const px = c * r;
    if (px > MAX_SCENE_PIXELS) {
      const f = Math.sqrt(MAX_SCENE_PIXELS / px);
      c = Math.round(c * f);
      r = Math.round(r * f);
    }
    return { cols: c, rows: r };
  }, [ssW, ssH, cellW, cellH, maxTex]);

  const rt = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(cols, rows, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    return t;
  }, [cols, rows]);

  const rtGlyph = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(ssW, ssH, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    return t;
  }, [ssW, ssH]);

  useEffect(() => () => rt.dispose(), [rt]);
  useEffect(() => () => rtGlyph.dispose(), [rtGlyph]);
  const { quadScene, quadCam, material, downScene, downMat } = useMemo(() => {
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
        uCellAspect: { value: CELL_ASPECT },
        uRamp: { value: 0.55 },
        uBase: { value: 0 },
        uFill: { value: 0.8 },
        uSubject: { value: 1.6 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const downMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: DOWN_FRAG,
      uniforms: {
        uSrc: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uSpread: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const downScene = new THREE.Scene();
    downScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), downMat));

    return { quadScene, quadCam, material, downScene, downMat };
  }, []);

  useFrame(({ scene, camera, clock }) => {
    material.uniforms.uScene.value = rt.texture;
    material.uniforms.uGrid.value.set(cols, rows);
    material.uniforms.uCellAspect.value = CELL_ASPECT;
    material.uniforms.uRamp.value = controls.ramp;
    material.uniforms.uBase.value = controls.base;
    material.uniforms.uFill.value = controls.fill;
    material.uniforms.uSubject.value = controls.subject;
    const t = clock.getElapsedTime();
    material.uniforms.uT.value = t;
    const rips = material.uniforms.uRip.value as THREE.Vector4[];
    while (pending.current.length) {
      const c = pending.current.shift()!;
      rips[slot.current % 5].set(c.x, c.y, t, 1);
      slot.current++;
    }
    // 1. scene at cell resolution  2. glyph stamp into the oversized target
    // 3. box-filter down to the canvas
    gl.setRenderTarget(rt);
    gl.render(scene, camera);

    gl.setRenderTarget(rtGlyph);
    gl.render(quadScene, quadCam);

    const dpr = gl.getPixelRatio();
    downMat.uniforms.uSrc.value = rtGlyph.texture;
    downMat.uniforms.uTexel.value.set(1 / ssW, 1 / ssH);
    downMat.uniforms.uSpread.value = Math.max(
      1,
      ssW / Math.max(1, size.width * dpr)
    );

    gl.setRenderTarget(null);
    gl.render(downScene, quadCam);
  }, 1);

  return null;
}
