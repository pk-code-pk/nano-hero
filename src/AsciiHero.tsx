// Type-first ASCII hero: 3D wordmark + the traced curse-mark shards,
// rendered as live colored ASCII. meshNormalMaterial paints surfaces by
// orientation, so the glyph colors shift iridescent as everything moves.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import AsciiPass from './AsciiPass';
import * as THREE from 'three';
import KoiSchool from './Koi';

function Wordmark({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame(({ clock }) => {
    if (!group.current || reduced) return;
    const t = clock.getElapsedTime();
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
          <meshNormalMaterial />
        </Text3D>
      </Center>
    </group>
  );
}

export default function AsciiHero({ reduced }: { reduced: boolean }) {
  return (
    <Canvas
      className="ascii-field"
      camera={{ position: [0, 0, 620], fov: 40, near: 1, far: 3000 }}
      dpr={[1, 2]}
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      resize={{ scroll: false }}
    >
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[200, 300, 400]} intensity={1.1} />
      <Wordmark reduced={reduced} />
      <KoiSchool reduced={reduced} />
      <AsciiPass />
    </Canvas>
  );
}
