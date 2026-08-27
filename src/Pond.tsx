// Underwater backdrop: one shader plane sitting behind the whole school.
// Its job is to feed the ASCII pass luminance structure — at sub-pixel cell
// sizes the glyph field reads as grain, and grain only reads as *something*
// when there is slow tonal movement underneath it.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useControls } from './asciiControls';

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uT;
  uniform float uWater;
  uniform float uCaustics;
  uniform float uZoom; // 1 = pattern spans the frame, lower = magnified
  uniform float uVig;  // corner falloff strength
  uniform float uHot;  // white-hot cores on the brightest vein peaks

  // --- value noise + fbm ---------------------------------------------------
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // zooming into the middle of the pattern is what the oversized plane was
    // doing by accident: big smooth light masses instead of fine veins
    vec2 uv = 0.5 + (vUv - 0.5) * uZoom;

    // --- depth gradient: lit surface up top, abyss below ------------------
    vec3 surface = vec3(0.075, 0.250, 0.330);
    vec3 mid     = vec3(0.030, 0.120, 0.190);
    vec3 abyss   = vec3(0.001, 0.005, 0.012);
    vec3 water = mix(abyss, mid, smoothstep(-0.05, 0.62, uv.y));
    water = mix(water, surface, smoothstep(0.60, 1.05, uv.y));

    // --- caustics: domain-warped fbm, ridged so it forms bright veins -----
    vec2 cp = vec2(uv.x * 3.4, uv.y * 2.1);
    vec2 warp = vec2(
      fbm(cp * 1.7 + vec2(uT * 0.045, uT * 0.02)),
      fbm(cp * 1.7 + vec2(4.7 - uT * 0.03, 2.3 + uT * 0.035))
    );
    float c = fbm(cp + warp * 1.8 + vec2(0.0, uT * 0.05));
    // two ridged bands at different scales read as overlapping light nets
    float veins = 1.0 - abs(c * 2.0 - 1.0);
    veins = pow(clamp(veins, 0.0, 1.0), 3.2);
    float c2 = fbm(cp * 2.3 - warp * 1.1 + vec2(uT * 0.07, 0.0));
    float veins2 = pow(clamp(1.0 - abs(c2 * 2.0 - 1.0), 0.0, 1.0), 5.0);
    float caustic = veins * 0.55 + veins2 * 0.34;
    // light comes from above, so caustics fade with depth
    caustic *= mix(0.15, 1.0, smoothstep(-0.1, 0.95, uv.y));

    // --- light shafts: soft angled bands, noise-broken --------------------
    float sx = uv.x + (1.0 - uv.y) * 0.55;
    float shafts = 0.0;
    shafts += smoothstep(0.055, 0.0, abs(fract(sx * 1.6 + 0.15) - 0.5) - 0.42);
    shafts += smoothstep(0.045, 0.0, abs(fract(sx * 2.7 + 0.62) - 0.5) - 0.44);
    shafts *= 0.5 + 0.5 * fbm(vec2(sx * 5.0, uv.y * 1.4 - uT * 0.06));
    shafts *= smoothstep(-0.25, 0.9, uv.y);

    vec3 lightCol = vec3(0.42, 0.86, 0.98);
    vec3 col = water * uWater;
    col += lightCol * caustic * uCaustics;
    // vein peaks blow out toward white — the hot spots in the water
    float hot = pow(clamp(caustic, 0.0, 1.6), 4.0);
    col += vec3(0.88, 0.96, 1.0) * hot * uHot;
    col += lightCol * shafts * uCaustics * 0.3;

    // sink the corners so the frame has a centre of mass
    // vignette works in screen space, so it frames the canvas regardless of
    // how far the pattern is zoomed
    float vig = smoothstep(1.05, 0.15, length((vUv - 0.5) * vec2(1.2, 1.05)));
    col *= mix(1.0 - uVig, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PLANE_Z = -900;

export default function Pond({ reduced }: { reduced: boolean }) {
  const { water, caustics, zoom, vignette, hot } = useControls();
  const mat = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uT: { value: 0 },
      uWater: { value: water },
      uCaustics: { value: caustics },
      uZoom: { value: 0.22 },
      uVig: { value: 0.3 },
      uHot: { value: 0.6 },
    }),
    // built once; values are pushed per-frame below
    []
  );

  useFrame(({ clock, camera, size }) => {
    if (mat.current) {
      const u = mat.current.uniforms;
      u.uT.value = reduced ? 0 : clock.getElapsedTime();
      u.uWater.value = water;
      u.uCaustics.value = caustics;
      u.uZoom.value = zoom;
      u.uVig.value = vignette;
      u.uHot.value = hot;
    }
    // Fit the plane to the frustum every frame. A fixed-size plane means uv
    // 0..1 spans far more than the screen, so the gradient, vignette and
    // caustic scale all land off-frame — badly so on a wide window, where you
    // end up staring at one magnified patch near the centre.
    if (mesh.current && (camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as THREE.PerspectiveCamera;
      const dist = cam.position.z - PLANE_Z;
      const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * dist;
      const w = h * (size.width / Math.max(1, size.height));
      mesh.current.scale.set(w, h, 1);
    }
  });

  // unit quad, scaled to the frustum each frame; sits behind every koi
  // (which live between z -90 and -350)
  return (
    <mesh ref={mesh} position={[0, 0, PLANE_Z]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
