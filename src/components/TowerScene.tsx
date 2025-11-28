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
  groundY: number;
  fadeDistance: number;
};

type LightingPreset = {
  background: string;
  fog: string;
  ambient: number;
  hemi: [string, string, number];
  dirIntensity: number;
  dirColor?: string;
  spotIntensity: number;
  spotColor?: string;
  material: {
    wireframe?: boolean;
    opacity?: number;
    transparent?: boolean;
    depthWrite?: boolean;
    roughness?: number;
    metalness?: number;
    emissiveIntensity?: number;
    flatShading?: boolean;
    colorOverride?: string;
    edgeColor?: string;
    edgeWidth?: number;
    edgeDepthTest?: boolean;
  };
  grid: {
    cellColor: string;
    sectionColor: string;
    cellSize?: number;
    sectionSize?: number;
    fadeStrength?: number;
  };
};

const LIGHTING_PRESETS: Record<TowerParameters["lighting"], LightingPreset> = {
  neutral: {
    background: "#030712",
    fog: "#050914",
    ambient: 0.75,
    hemi: ["#94a5ff", "#050505", 0.9],
    dirIntensity: 1.35,
    spotIntensity: 0.9,
    material: { roughness: 0.35, metalness: 0.2, emissiveIntensity: 0.18, edgeWidth: 1, edgeColor: "#f8f9ff" },
    grid: { cellColor: "rgba(40, 74, 109, 0.45)", sectionColor: "rgba(80, 140, 220, 0.8)", fadeStrength: 0.35 },
  },
  warm: {
    background: "#0b0808",
    fog: "#120c0c",
    ambient: 0.9,
    hemi: ["#f3c078", "#120707", 0.85],
    dirIntensity: 1.5,
    dirColor: "#ffd29c",
    spotIntensity: 1.1,
    spotColor: "#ff9b5f",
    material: {
      roughness: 0.4,
      metalness: 0.12,
      emissiveIntensity: 0.12,
      colorOverride: "#f7c182",
      edgeColor: "#ffe9c7",
      edgeWidth: 1.2,
    },
    grid: { cellColor: "rgba(120, 70, 35, 0.35)", sectionColor: "rgba(230, 150, 70, 0.55)", fadeStrength: 0.4 },
  },
  cool: {
    background: "#04101c",
    fog: "#061424",
    ambient: 0.65,
    hemi: ["#9bd5ff", "#050608", 1],
    dirIntensity: 1.2,
    dirColor: "#9cd5ff",
    spotIntensity: 0.85,
    spotColor: "#8fb5ff",
    material: { roughness: 0.3, metalness: 0.25, emissiveIntensity: 0.14, edgeColor: "#dff2ff", edgeWidth: 1 },
    grid: { cellColor: "rgba(40, 90, 150, 0.35)", sectionColor: "rgba(120, 190, 255, 0.65)" },
  },
  contrast: {
    background: "#08030b",
    fog: "#0d0612",
    ambient: 0.45,
    hemi: ["#9fb7ff", "#050505", 0.7],
    dirIntensity: 1.8,
    dirColor: "#ffffff",
    spotIntensity: 1.35,
    spotColor: "#a0c2ff",
    material: { roughness: 0.25, metalness: 0.35, emissiveIntensity: 0.2, edgeColor: "#ffffff", edgeWidth: 1.6 },
    grid: { cellColor: "rgba(220, 180, 255, 0.18)", sectionColor: "rgba(255, 190, 255, 0.45)", fadeStrength: 0.25 },
  },
  soft: {
    background: "#0a0c11",
    fog: "#0c1018",
    ambient: 1.05,
    hemi: ["#d3e2ff", "#0a0b0f", 0.7],
    dirIntensity: 0.9,
    dirColor: "#dbe5ff",
    spotIntensity: 0.6,
    spotColor: "#d3ddff",
    material: { roughness: 0.6, metalness: 0.05, emissiveIntensity: 0.1, edgeColor: "#f0f4ff", edgeWidth: 1 },
    grid: { cellColor: "rgba(120, 140, 200, 0.25)", sectionColor: "rgba(180, 200, 255, 0.5)", fadeStrength: 0.45 },
  },
  shaded: {
    background: "#020309",
    fog: "#050712",
    ambient: 0.4,
    hemi: ["#b6c7ff", "#050505", 0.9],
    dirIntensity: 2.2,
    spotIntensity: 1.6,
    material: { roughness: 0.3, metalness: 0.32, emissiveIntensity: 0.18, edgeColor: "#f8f9ff", edgeWidth: 1.2 },
    grid: { cellColor: "rgba(100, 110, 180, 0.25)", sectionColor: "rgba(170, 190, 255, 0.5)", fadeStrength: 0.35 },
  },
  wireframe: {
    background: "#0a0a0f",
    fog: "#0c0e16",
    ambient: 0.25,
    hemi: ["#6ba4ff", "#020202", 0.4],
    dirIntensity: 0.9,
    dirColor: "#9fc2ff",
    spotIntensity: 0.5,
    spotColor: "#7bb2ff",
    material: { wireframe: true, roughness: 0.1, metalness: 0.05, emissiveIntensity: 0, edgeColor: "#c4e0ff", edgeWidth: 1, edgeDepthTest: false },
    grid: { cellColor: "rgba(130, 170, 240, 0.35)", sectionColor: "rgba(200, 230, 255, 0.5)", fadeStrength: 0.2 },
  },
  technical: {
    background: "#0c0d10",
    fog: "#0f1218",
    ambient: 0.6,
    hemi: ["#d8e4f5", "#0b0c10", 0.6],
    dirIntensity: 1.4,
    dirColor: "#e8edf5",
    spotIntensity: 1.2,
    spotColor: "#e0e8f5",
    material: {
      roughness: 0.85,
      metalness: 0.02,
      emissiveIntensity: 0,
      flatShading: true,
      colorOverride: "#e7edf5",
      edgeColor: "#0c1f38",
      edgeWidth: 2,
      edgeDepthTest: false,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    },
    grid: { cellColor: "rgba(40, 70, 120, 0.5)", sectionColor: "rgba(200, 220, 240, 0.5)", fadeStrength: 0.3 },
  },
  ghosted: {
    background: "#06070a",
    fog: "#080910",
    ambient: 1,
    hemi: ["#cfdfff", "#050505", 0.9],
    dirIntensity: 0.8,
    spotIntensity: 0.5,
    material: {
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      roughness: 0.2,
      metalness: 0.05,
      emissiveIntensity: 0.05,
      edgeColor: "#dff0ff",
      edgeWidth: 1.2,
      edgeDepthTest: false,
    },
    grid: { cellColor: "rgba(140, 170, 220, 0.15)", sectionColor: "rgba(190, 220, 255, 0.35)", fadeStrength: 0.5 },
  },
  outline: {
    background: "#0a0804",
    fog: "#0d0a06",
    ambient: 0.55,
    hemi: ["#ffffff", "#040404", 0.6],
    dirIntensity: 1.2,
    dirColor: "#ffffff",
    spotIntensity: 0.9,
    spotColor: "#9cbcff",
    material: {
      roughness: 0.6,
      metalness: 0.1,
      emissiveIntensity: 0.08,
      flatShading: true,
      edgeColor: "#f8f8ff",
      edgeWidth: 3,
      edgeDepthTest: false,
    },
    grid: { cellColor: "rgba(240, 210, 190, 0.12)", sectionColor: "rgba(255, 230, 200, 0.35)", fadeStrength: 0.25 },
  },
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

const TowerSlab = ({
  floor,
  thickness,
  materialStyle,
}: {
  floor: TowerFloor;
  thickness: number;
  materialStyle: LightingPreset["material"];
}) => {
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
      <meshStandardMaterial
        color={materialStyle.colorOverride ?? floor.color}
        roughness={materialStyle.roughness ?? 0.35}
        metalness={materialStyle.metalness ?? 0.2}
        emissive={materialStyle.colorOverride ?? floor.color}
        emissiveIntensity={materialStyle.emissiveIntensity ?? 0.18}
        wireframe={materialStyle.wireframe ?? false}
        transparent={materialStyle.transparent ?? false}
        opacity={materialStyle.opacity ?? 1}
        depthWrite={materialStyle.depthWrite ?? true}
        flatShading={materialStyle.flatShading ?? false}
      />
      <Edges
        color={materialStyle.edgeColor ?? "#f8f9ff"}
        renderOrder={materialStyle.edgeDepthTest === false ? 10 : 0}
        lineMaterialProps={{
          depthTest: materialStyle.edgeDepthTest ?? true,
          linewidth: materialStyle.edgeWidth ?? 1.2,
          transparent: true,
          opacity: 1,
        }}
      />
    </mesh>
  );
};

const TowerContent = ({ params, tower, offset, groundY, fadeDistance }: TowerContentProps) => {
  const baseRadius = tower.baseRadius;
  const height = tower.height;
  const groupRef = useRef<Group>(null);
  const lighting = LIGHTING_PRESETS[params.lighting] ?? LIGHTING_PRESETS.neutral;

  useFrame(({ clock }) => {
    if (!params.animate || !groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = (t * params.animationSpeed) / 5;
  });

  return (
    <>
      <ambientLight intensity={lighting.ambient} />
      <group position={offset}>
        <hemisphereLight args={lighting.hemi} position={[0, height, 0]} />
        <directionalLight
          position={[baseRadius * 4, height * 1.6, baseRadius * 3]}
          intensity={lighting.dirIntensity}
          color={lighting.dirColor}
          castShadow
        />
        <spotLight
          position={[-baseRadius * 4, height * 2, -baseRadius * 2]}
          intensity={lighting.spotIntensity}
          color={lighting.spotColor}
          angle={0.6}
          castShadow
        />
        <group ref={groupRef}>
          {tower.floors.map((floor) => (
            <TowerSlab key={floor.index} floor={floor} thickness={tower.slabHeight} materialStyle={lighting.material} />
          ))}
        </group>
        <Grid
          args={[80, 80]}
          position={[0, groundY - 0.021, 0]}
          cellSize={lighting.grid.cellSize ?? 1.8}
          sectionSize={lighting.grid.sectionSize ?? 8}
          cellThickness={0.4}
          sectionThickness={1}
          cellColor={lighting.grid.cellColor}
          sectionColor={lighting.grid.sectionColor}
          infiniteGrid
          fadeDistance={fadeDistance}
          fadeStrength={lighting.grid.fadeStrength ?? 0.35}
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
      return { center: [0, 0, 0] as const, span: tower.height, minY: -tower.height / 2 };
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, tower.height);

    return { center: [centerX, centerY, centerZ] as const, span, minY };
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
  const groundYLocal = useMemo(
    () => towerBounds.minY - towerBounds.center[1],
    [towerBounds.minY, towerBounds.center]
  );
  const gridFadeDistance = useMemo(() => Math.max(sceneSpan * 3, 180), [sceneSpan]);

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
      <color attach="background" args={[LIGHTING_PRESETS[params.lighting]?.background ?? "#030712"]} />
      <AdaptiveFog
        color={LIGHTING_PRESETS[params.lighting]?.fog ?? "#050914"}
        baseNear={fogNear}
        baseFar={fogFar}
        span={sceneSpan}
      />
      <Suspense fallback={null}>
        <TowerContent
          params={params}
          tower={tower}
          offset={modelOffset}
          groundY={groundYLocal}
          fadeDistance={gridFadeDistance}
        />
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
