import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, StatsGl } from "@react-three/drei";
import { CylinderGeometry } from "three";

import { buildTower } from "../lib/tower";
import type { TowerParameters, TowerFloor } from "../types/tower";

type TowerSceneProps = {
  params: TowerParameters;
};

const TowerSlab = ({ floor, thickness }: { floor: TowerFloor; thickness: number }) => {
  const geometry = useMemo(
    () => new CylinderGeometry(floor.radius, floor.radius, thickness, 48, 1, false),
    [floor.radius, thickness]
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh position={[0, floor.positionY, 0]} rotation={[0, floor.rotation, 0]} castShadow receiveShadow geometry={geometry}>
      <meshStandardMaterial color={floor.color} roughness={0.4} metalness={0.15} />
    </mesh>
  );
};

export const TowerScene = ({ params }: TowerSceneProps) => {
  const tower = useMemo(() => buildTower(params), [params]);
  const cameraDistance = params.towerHeight * 1.4;

  return (
    <Canvas
      shadows
      camera={{ position: [params.baseRadius * 2, params.towerHeight * 0.9, cameraDistance], fov: 45 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#050709"]} />
      <fog attach="fog" args={["#050709", params.baseRadius, params.towerHeight * 5]} />
      <Suspense fallback={null}>
        <ambientLight intensity={0.45} />
        <hemisphereLight args={["#94a5ff", "#0a0a0a", 0.75]} position={[0, params.towerHeight, 0]} />
        <directionalLight
          position={[params.baseRadius * 4, params.towerHeight * 1.6, params.baseRadius * 3]}
          intensity={1.1}
          castShadow
        />

        {tower.floors.map((floor) => (
          <TowerSlab key={floor.index} floor={floor} thickness={tower.slabHeight} />
        ))}

        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -tower.height / 2 - 0.05, 0]}>
          <planeGeometry args={[params.baseRadius * 12, params.baseRadius * 12]} />
          <meshStandardMaterial color="#0c0f1a" roughness={1} metalness={0} />
        </mesh>
      </Suspense>
      <StatsGl className="stats" />
      <OrbitControls enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI * 0.475} />
    </Canvas>
  );
};
