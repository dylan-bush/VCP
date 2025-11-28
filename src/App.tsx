import { useEffect, useMemo, useRef, useState } from "react";
import { CylinderGeometry, Matrix4, Color } from "three";

import { TowerScene } from "./components/TowerScene";
import { ProfileMapper } from "./components/ProfileMapper";
import { buildTower } from "./lib/tower";
import type { TowerParameters } from "./types/tower";

const defaultParams: TowerParameters = {
  floorCount: 32,
  towerHeight: 80,
  baseRadius: 6,
  twistMin: -20,
  twistMax: 120,
  scaleMin: 0.7,
  scaleMax: 1.4,
  floorThickness: 0.65,
  slabSides: 4,
  gradientStart: "#22aed1",
  gradientEnd: "#f26419",
  animate: true,
  animationSpeed: 2.5,
  profilePoints: [1.05, 1.1, 0.92, 1.2, 1.0],
  floorProfilePoints: [1, 0.9, 1.1, 1.0],
  lighting: "neutral",
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export default function App() {
  const [params, setParams] = useState<TowerParameters>({ ...defaultParams });
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [savedStates, setSavedStates] = useState<TowerParameters[]>([]);
  const [selectedStateIndex, setSelectedStateIndex] = useState<number | null>(null);
  const [openSections, setOpenSections] = useState({
    profiles: true,
    structure: true,
    transform: true,
    appearance: false,
    animation: false,
  });

  const handleNumber = (key: keyof TowerParameters, min: number, max: number, step = 0.01) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      setParams((p) => ({ ...p, [key]: clamp(Number.isFinite(next) ? next : min, min, max) }));
    };

  const handleColor = (key: keyof TowerParameters) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((p) => ({ ...p, [key]: e.target.value }));
  };

  const handleCheckbox = (key: keyof TowerParameters) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((p) => ({ ...p, [key]: e.target.checked }));
  };
  const handleSelect = (key: keyof TowerParameters) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setParams((p) => ({ ...p, [key]: e.target.value as TowerParameters[typeof key] }));
  };

  const handleProfilePoints = (points: number[]) => setParams((p) => ({ ...p, profilePoints: points }));
  const handleFloorProfilePoints = (points: number[]) => setParams((p) => ({ ...p, floorProfilePoints: points }));

  const resamplePoints = (current: number[], count: number) => {
    if (current.length === 0) return Array.from({ length: count }, () => 1);
    if (current.length === count) return current;
    const resampled: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const t = (i / (count - 1)) * (current.length - 1);
      const base = Math.floor(t);
      const frac = t - base;
      const a = current[base] ?? 1;
      const b = current[Math.min(base + 1, current.length - 1)] ?? a;
      resampled.push(a + (b - a) * frac);
    }
    return resampled;
  };

  const handleProfileHandleCount = (nextCount: number) => {
    const count = clamp(Math.round(nextCount), 2, 8);
    setParams((p) => {
      const current = p.profilePoints || [];
      return { ...p, profilePoints: resamplePoints(current, count) };
    });
  };

  const handleFloorProfileHandleCount = (nextCount: number) => {
    const count = clamp(Math.round(nextCount), 2, 8);
    setParams((p) => {
      const current = p.floorProfilePoints || [];
      return { ...p, floorProfilePoints: resamplePoints(current, count) };
    });
  };

  const handleReset = () => setParams({ ...defaultParams });
  const handleRandomize = () => {
    const randomBetween = (min: number, max: number, step = 0.01) => {
      const value = Math.random() * (max - min) + min;
      return Math.round(value / step) * step;
    };
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomColor = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
    const randomProfilePoints = (count: number) => {
      const points: number[] = [];
      for (let i = 0; i < count; i += 1) {
        points.push(randomBetween(0.65, 1.45, 0.05));
      }
      return points;
    };
    const randomFloorProfilePoints = (count: number) => {
      const points: number[] = [];
      for (let i = 0; i < count; i += 1) {
        points.push(randomBetween(0.7, 1.3, 0.05));
      }
      return points;
    };

    const scaleMin = randomBetween(0.3, 1.2, 0.05);
    const scaleMax = randomBetween(scaleMin + 0.1, 2.1, 0.05);
    const profileCount = randomInt(3, 6);
    const floorProfileCount = randomInt(3, 6);

    setParams({
      floorCount: randomInt(18, 100),
      towerHeight: randomInt(40, 180),
      baseRadius: randomBetween(3, 12, 0.1),
      floorThickness: randomBetween(0.3, 0.85, 0.05),
      twistMin: randomInt(-120, 0),
      twistMax: randomInt(45, 330),
      scaleMin,
      scaleMax,
      slabSides: randomInt(3, 18),
      gradientStart: randomColor(),
      gradientEnd: randomColor(),
      animate: Math.random() > 0.3,
      animationSpeed: randomBetween(0.5, 3.5, 0.1),
      profilePoints: randomProfilePoints(profileCount),
      floorProfilePoints: randomFloorProfilePoints(floorProfileCount),
      lighting: (["neutral", "warm", "cool", "contrast", "soft", "shaded", "wireframe", "technical", "ghosted", "outline"] as const)[randomInt(0, 9)],
    });
  };

  const displayParams = useMemo(() => params, [params]);
  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  const scrollTouchY = useRef<number | null>(null);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 3) {
        scrollTouchY.current = null;
        return;
      }
      const y = e.touches[0]?.clientY ?? 0;
      if (scrollTouchY.current !== null) {
        const dy = scrollTouchY.current - y;
        window.scrollBy(0, dy);
      }
      scrollTouchY.current = y;
      e.preventDefault();
    };
    const reset = () => {
      scrollTouchY.current = null;
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", reset);
    window.addEventListener("touchcancel", reset);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", reset);
      window.removeEventListener("touchcancel", reset);
    };
  }, []);
  const handleSaveState = () => {
    setSavedStates((prev) => {
      const next = [...prev, JSON.parse(JSON.stringify(params))];
      setSelectedStateIndex(next.length - 1);
      return next;
    });
  };
  const handleLoadState = (idx: number) => {
    const preset = savedStates[idx];
    if (!preset) return;
    setParams({ ...preset });
    setSelectedStateIndex(idx);
  };
  const handleExportOBJ = async () => {
    const tower = buildTower(params);
    let objLines: string[] = ["# VCP tower OBJ export", `# Floors: ${tower.floorCount}`, ""];
    let vertexOffset = 0;
    const matrix = new Matrix4();

    for (const floor of tower.floors) {
      const geometry = new CylinderGeometry(1, 1, tower.slabHeight, floor.sides, 1, false);
      geometry.scale(floor.scaleX, 1, floor.scaleZ);
      geometry.applyMatrix4(matrix.makeRotationY(floor.rotation));
      geometry.translate(floor.offsetX, floor.positionY, floor.offsetZ);

      const position = geometry.getAttribute("position");
      const index = geometry.getIndex();
      const color = new Color(floor.color);

      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i).toFixed(5);
        const y = position.getY(i).toFixed(5);
        const z = position.getZ(i).toFixed(5);
        objLines.push(`v ${x} ${y} ${z} ${color.r.toFixed(5)} ${color.g.toFixed(5)} ${color.b.toFixed(5)}`);
      }

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i) + 1 + vertexOffset;
          const b = index.getX(i + 1) + 1 + vertexOffset;
          const c = index.getX(i + 2) + 1 + vertexOffset;
          objLines.push(`f ${a} ${b} ${c}`);
        }
      } else {
        for (let i = 0; i < position.count; i += 3) {
          const a = i + 1 + vertexOffset;
          const b = i + 2 + vertexOffset;
          const c = i + 3 + vertexOffset;
          objLines.push(`f ${a} ${b} ${c}`);
        }
      }

      vertexOffset += position.count;
      geometry.dispose();
    }

    const objContent = objLines.join("\n");
    const blob = new Blob([objContent], { type: "text/plain" });
    const suggestedName = `vcp-tower-${Date.now()}.obj`;

    const saveWithPicker = async () => {
      if (!("showSaveFilePicker" in window)) return false;
      try {
        const picker = (window as unknown as {
          showSaveFilePicker: (options: FilePickerOptions) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker;
        if (!picker) return false;
        const handle = await picker({
          suggestedName,
          types: [
            {
              description: "Wavefront OBJ",
              accept: {
                "application/octet-stream": [".obj"],
                "text/plain": [".obj"],
                "model/obj": [".obj"],
              },
            },
          ],
          excludeAcceptAllOption: true,
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (err) {
        console.warn("Save picker unavailable, falling back to download", err);
        return false;
      }
    };

    const saved = await saveWithPicker();
    if (saved) return;

    const downloadName = suggestedName.endsWith(".obj") ? suggestedName : `${suggestedName}.obj`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const startSidebarResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const minWidth = 260;
    const maxWidth = Math.min(640, window.innerWidth - 200);

    const handleMove = (event: PointerEvent) => {
      const next = window.innerWidth - event.clientX;
      setSidebarWidth(Math.min(Math.max(next, minWidth), Math.max(minWidth, maxWidth)));
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div className="app-shell" style={{ ["--sidebar-width" as string]: `${sidebarWidth}px` }}>
      <div className="mobile-controls-link">
        <a href="#controls">Jump to Controls</a>
      </div>
      <main className="viewport" aria-label="Parametric tower viewport">
        <TowerScene params={displayParams} />
      </main>
      <div
        className="sidebar-resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        onPointerDown={startSidebarResize}
      />
      <aside className="sidebar" id="controls">
        <header className="sidebar__header">
          <div className="state-controls">
            <button type="button" onClick={handleSaveState}>
              Save state
            </button>
            <select
              value={selectedStateIndex ?? ""}
              onChange={(e) => handleLoadState(Number(e.target.value))}
              disabled={savedStates.length === 0}
            >
              <option value="" disabled>
                Saved states
              </option>
              {savedStates.map((_, idx) => (
                <option key={idx} value={idx}>
                  State {idx + 1}
                </option>
              ))}
            </select>
            <select value={params.lighting} onChange={handleSelect("lighting")} aria-label="View mode">
              <option value="neutral">View Mode: Neutral Studio</option>
              <option value="warm">View Mode: Warm Sunset</option>
              <option value="cool">View Mode: Cool Sky</option>
              <option value="contrast">View Mode: Contrast Rim</option>
              <option value="soft">View Mode: Soft Dome</option>
              <option value="shaded">View Mode: Shaded</option>
              <option value="wireframe">View Mode: Wireframe</option>
              <option value="technical">View Mode: Technical</option>
              <option value="ghosted">View Mode: Ghosted</option>
              <option value="outline">View Mode: Profile Outlines</option>
            </select>
          </div>
          <div>
            <h1>VCP</h1>
            <p className="muted">Sculpt the tower profile, floor plans, twist, taper, and colors.</p>
          </div>
          <div className="button-row">
            <button type="button" onClick={handleRandomize}>
              Randomize
            </button>
            <button type="button" onClick={handleReset}>
              Reset
            </button>
            <button type="button" onClick={handleExportOBJ}>
              Export OBJ
            </button>
          </div>
        </header>

        <details className="panel" open={openSections.profiles}>
          <summary onClick={(e) => { e.preventDefault(); toggleSection("profiles"); }}>
            <span>Profile Curves</span>
            <small>Footprint and floor aspect along height</small>
          </summary>
          <div className="panel__body">
            <div className="profile-section">
              <h2>Tower radius</h2>
              <p className="muted">Shape the footprint radius from base to top.</p>
              <label className="inline-range">
                <span>Profile handles</span>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={params.profilePoints.length}
                  onChange={(e) => handleProfileHandleCount(Number(e.target.value))}
                />
                <small>{params.profilePoints.length}</small>
              </label>
              <ProfileMapper points={params.profilePoints} onChange={handleProfilePoints} />
            </div>
            <div className="profile-section">
              <h2>Floor aspect</h2>
              <p className="muted">Control how squashed or stretched each slab is across the height.</p>
              <label className="inline-range">
                <span>Aspect handles</span>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={params.floorProfilePoints.length}
                  onChange={(e) => handleFloorProfileHandleCount(Number(e.target.value))}
                />
                <small>{params.floorProfilePoints.length}</small>
              </label>
              <ProfileMapper points={params.floorProfilePoints} onChange={handleFloorProfilePoints} min={0.6} max={1.4} />
            </div>
          </div>
        </details>

        <details className="panel" open={openSections.structure}>
          <summary onClick={(e) => { e.preventDefault(); toggleSection("structure"); }}>
            <span>Structure</span>
            <small>Counts, height, thickness, sides</small>
          </summary>
          <div className="panel__body controls-grid">
            <label>
              <span>Floors</span>
              <input type="range" min={3} max={120} step={1} value={params.floorCount} onChange={handleNumber("floorCount", 3, 120)} />
              <small>{params.floorCount}</small>
            </label>
            <label>
              <span>Height</span>
              <input type="range" min={20} max={220} step={1} value={params.towerHeight} onChange={handleNumber("towerHeight", 20, 220)} />
              <small>{params.towerHeight.toFixed(0)}</small>
            </label>
            <label>
              <span>Base Radius</span>
              <input type="range" min={2} max={15} step={0.1} value={params.baseRadius} onChange={handleNumber("baseRadius", 2, 15)} />
              <small>{params.baseRadius.toFixed(1)}</small>
            </label>
            <label>
              <span>Slab Thickness</span>
              <input type="range" min={0.2} max={1} step={0.05} value={params.floorThickness} onChange={handleNumber("floorThickness", 0.2, 1)} />
              <small>{params.floorThickness.toFixed(2)}</small>
            </label>
            <label>
              <span>Slab Sides</span>
              <input type="range" min={3} max={24} step={1} value={params.slabSides} onChange={handleNumber("slabSides", 3, 24)} />
              <small>{params.slabSides}</small>
            </label>
          </div>
        </details>

        <details className="panel" open={openSections.transform}>
          <summary onClick={(e) => { e.preventDefault(); toggleSection("transform"); }}>
            <span>Transform</span>
            <small>Twist and taper</small>
          </summary>
          <div className="panel__body controls-grid">
            <label>
              <span>Twist Min</span>
              <input type="range" min={-180} max={0} step={1} value={params.twistMin} onChange={handleNumber("twistMin", -180, 0)} />
              <small>{params.twistMin.toFixed(0)}deg</small>
            </label>
            <label>
              <span>Twist Max</span>
              <input type="range" min={0} max={360} step={1} value={params.twistMax} onChange={handleNumber("twistMax", 0, 360)} />
              <small>{params.twistMax.toFixed(0)}deg</small>
            </label>
            <label>
              <span>Scale Min</span>
              <input type="range" min={0.25} max={1.5} step={0.05} value={params.scaleMin} onChange={handleNumber("scaleMin", 0.25, 1.5)} />
              <small>{params.scaleMin.toFixed(2)}</small>
            </label>
            <label>
              <span>Scale Max</span>
              <input type="range" min={0.25} max={2.5} step={0.05} value={params.scaleMax} onChange={handleNumber("scaleMax", 0.25, 2.5)} />
              <small>{params.scaleMax.toFixed(2)}</small>
            </label>
          </div>
        </details>

        <details className="panel" open={openSections.appearance}>
          <summary onClick={(e) => { e.preventDefault(); toggleSection("appearance"); }}>
            <span>Appearance</span>
            <small>Gradient colors</small>
          </summary>
          <div className="panel__body controls-grid">
            <label>
              <span>Bottom Color</span>
              <input type="color" value={params.gradientStart} onChange={handleColor("gradientStart")} />
              <small>{params.gradientStart}</small>
            </label>
            <label>
              <span>Top Color</span>
              <input type="color" value={params.gradientEnd} onChange={handleColor("gradientEnd")} />
              <small>{params.gradientEnd}</small>
            </label>
          </div>
        </details>

        <details className="panel" open={openSections.animation}>
          <summary onClick={(e) => { e.preventDefault(); toggleSection("animation"); }}>
            <span>Animation</span>
            <small>Turntable</small>
          </summary>
          <div className="panel__body controls-grid">
            <label className="checkbox-row">
              <input type="checkbox" checked={params.animate} onChange={handleCheckbox("animate")} />
              <span>Animate (turntable)</span>
            </label>
            <label>
              <span>Animation Speed</span>
              <input
                type="range"
                min={0.1}
                max={4}
                step={0.1}
                value={params.animationSpeed}
                onChange={handleNumber("animationSpeed", 0.1, 4)}
                disabled={!params.animate}
              />
              <small>{params.animationSpeed.toFixed(1)}x</small>
            </label>
          </div>
        </details>
      </aside>
    </div>
  );
}
