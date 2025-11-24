import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, StatsGl, Edges, Grid } from "@react-three/drei";
import { BoxGeometry, Group } from "three";

import { buildTower } from "../lib/tower";
import type { TowerParameters, TowerFloor } from "../types/tower";

type TowerSceneProps = {
  params: TowerParameters;
};

type TowerContentProps = {
  params: TowerParameters;
  tower: ReturnType<typeof buildTower>;
};

const TowerSlab = ({ floor, thickness }: { floor: TowerFloor; thickness: number }) => {
  const geometry = useMemo(
    () => new BoxGeometry(floor.scaleX * 2, thickness, floor.scaleZ * 2, 1, 1, 1),
    [floor.scaleX, floor.scaleZ, thickness]
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      position={[floor.offsetX, floor.positionY, floor.offsetZ]}
      rotation={[0, floor.rotation, 0]}
      castShadow
      receiveShadow
      geometry={geometry}
    >
      <meshStandardMaterial color={floor.color} roughness={0.35} metalness={0.2} emissive={floor.color} emissiveIntensity={0.18} />
      <Edges color="#f8f9ff" />
    </mesh>
  );
};

const TowerContent = ({ params, tower }: TowerContentProps) => {
  const baseRadius = tower.baseRadius;
  const height = tower.height;
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!params.animate || !groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = (t * params.animationSpeed) / 5;
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#94a5ff", "#050505", 0.9]} position={[0, height, 0]} />
      <directionalLight
        position={[baseRadius * 4, height * 1.6, baseRadius * 3]}
        intensity={1.35}
        castShadow
      />
      <spotLight position={[-baseRadius * 4, height * 2, -baseRadius * 2]} intensity={0.9} angle={0.6} castShadow />
      <group ref={groupRef}>
        {tower.floors.map((floor) => (
          <TowerSlab key={floor.index} floor={floor} thickness={tower.slabHeight} />
        ))}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -height / 2 - 0.05, 0]}>
        <planeGeometry args={[baseRadius * 14, baseRadius * 14]} />
        <meshStandardMaterial color="#10182c" roughness={0.85} metalness={0.05} />
      </mesh>
      <Grid
        args={[50, 50]}
        position={[0, -height / 2 - 0.049, 0]}
        cellColor="#1b385f"
        sectionColor="#3a7bd5"
        infiniteGrid
        fadeDistance={60}
        fadeStrength={6}
      />
    </>
  );
};

const hasWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!window.WebGLRenderingContext && !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
};

const hasWebGL2 = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
};

export const TowerScene = ({ params }: TowerSceneProps) => {
  const [webglReady, setWebglReady] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const tower = buildTower(params);

  useEffect(() => {
    setWebglReady(hasWebGL());
    setShowStats(hasWebGL2());
  }, []);

  if (!webglReady) {
    return (
      <div className="webgl-warning">
        <h2>WebGL Required</h2>
        <p>Your browser needs WebGL enabled to render the parametric tower.</p>
        <ul>
          <li>Enable hardware acceleration in your browser settings.</li>
          <li>Update GPU drivers or try another browser such as Chrome or Edge.</li>
        </ul>
      </div>
    );
  }

  const cameraDistance = Math.max(tower.height, tower.baseRadius * 6);

  return (
    <Canvas
      shadows
      camera={{ position: [tower.baseRadius * 2.2, tower.height * 1.05, cameraDistance], fov: 45 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#030712"]} />
      <fog attach="fog" args={["#050914", tower.baseRadius * 1.5, tower.height * 5]} />
      <Suspense fallback={null}>
        <TowerContent params={params} tower={tower} />
      </Suspense>
      {showStats && <StatsGl className="stats" />}
      <OrbitControls enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI * 0.475} />
    </Canvas>
  );
};
