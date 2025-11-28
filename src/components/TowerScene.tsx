import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, StatsGl, Edges, Grid } from "@react-three/drei";
import { CylinderGeometry, Group, Fog } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { buildTower } from "../lib/tower";
import type { TowerParameters, TowerFloor } from "../types/tower";

type TowerSceneProps = {
  params: TowerParameters;
};

type TowerContentProps = {
  params: TowerParameters;
  tower: ReturnType<typeof buildTower>;
  offset: readonly [number, number, number];
};

const AdaptiveFog = ({ color, baseNear, baseFar, span }: { color: string; baseNear: number; baseFar: number; span: number }) => {
  const { scene, camera } = useThree();

  useEffect(() => {
    const fog = new Fog(color, baseNear, baseFar);
    scene.fog = fog;
    return () => {
      if (scene.fog === fog) scene.fog = null;
    };
  }, [scene, color, baseNear, baseFar]);

  useFrame(() => {
    const distance = camera.position.length();
    const near = Math.max(baseNear, distance * 0.65);
    const far = Math.max(baseFar, near + span * 4, distance * 1.4 + span * 2);
    const fog = scene.fog as Fog | null;
    if (fog) {
      fog.near = near;
      fog.far = far;
    }
  });

  return null;
};

const TowerSlab = ({ floor, thickness }: { floor: TowerFloor; thickness: number }) => {
  const geometry = useMemo(() => {
    const geo = new CylinderGeometry(1, 1, thickness, floor.sides, 1, false);
    geo.scale(floor.scaleX, 1, floor.scaleZ);
    return geo;
  }, [floor.scaleX, floor.scaleZ, floor.sides, thickness]);

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

const TowerContent = ({ params, tower, offset }: TowerContentProps) => {
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
      <group position={offset}>
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
      </group>
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
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const tower = useMemo(() => buildTower(params), [params]);

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

  const towerBounds = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    tower.floors.forEach((floor) => {
      const radius = Math.max(floor.scaleX, floor.scaleZ);
      minX = Math.min(minX, floor.offsetX - radius);
      maxX = Math.max(maxX, floor.offsetX + radius);
      minZ = Math.min(minZ, floor.offsetZ - radius);
      maxZ = Math.max(maxZ, floor.offsetZ + radius);
      minY = Math.min(minY, floor.positionY - tower.slabHeight / 2);
      maxY = Math.max(maxY, floor.positionY + tower.slabHeight / 2);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      return { center: [0, 0, 0] as const, span: tower.height };
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, tower.height);

    return { center: [centerX, centerY, centerZ] as const, span };
  }, [tower]);

  const cameraDistance = Math.max(tower.height, tower.baseRadius * 6);
  const sceneSpan = Math.max(tower.height, tower.baseRadius * 8, towerBounds.span * 1.1);
  // Keep fog distances wide enough so compact towers or zoomed-out views do not get swallowed by darkness.
  const fogNear = Math.max(12, sceneSpan * 0.4);
  const fogFar = Math.max(fogNear + 250, sceneSpan * 5);
  const minDistance = Math.max(6, tower.baseRadius * 1.35);
  const maxDistance = Math.max(tower.height * 3.5, tower.baseRadius * 18);
  const modelOffset = useMemo(
    () => [-towerBounds.center[0], -towerBounds.center[1], -towerBounds.center[2]] as const,
    [towerBounds.center]
  );

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }, [towerBounds]);

  return (
    <Canvas
      shadows
      camera={{ position: [tower.baseRadius * 2.2, tower.height * 1.05, cameraDistance], fov: 45 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#030712"]} />
      <AdaptiveFog color="#050914" baseNear={fogNear} baseFar={fogFar} span={sceneSpan} />
      <Suspense fallback={null}>
        <TowerContent params={params} tower={tower} offset={modelOffset} />
      </Suspense>
      {showStats && <StatsGl className="stats" />}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.12}
        maxPolarAngle={Math.PI * 0.48}
        minPolarAngle={0}
        minDistance={minDistance}
        maxDistance={maxDistance}
        zoomSpeed={1.2}
        rotateSpeed={0.95}
        panSpeed={0.95}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
};
