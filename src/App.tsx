import { useMemo, useState } from "react";

import { TowerScene } from "./components/TowerScene";
import { ProfileMapper } from "./components/ProfileMapper";
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
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

export default function App() {
  const [params, setParams] = useState<TowerParameters>({ ...defaultParams });

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

  const handleProfilePoints = (points: number[]) => {
    setParams((p) => ({ ...p, profilePoints: points }));
  };

  const handleProfileHandleCount = (nextCount: number) => {
    const count = clamp(Math.round(nextCount), 2, 8);
    setParams((p) => {
      const current = p.profilePoints || [];
      if (current.length === count) return p;
      if (current.length === 0) {
        return { ...p, profilePoints: Array.from({ length: count }, () => 1) };
      }
      const resampled: number[] = [];
      for (let i = 0; i < count; i += 1) {
        const t = (i / (count - 1)) * (current.length - 1);
        const base = Math.floor(t);
        const frac = t - base;
        const a = current[base] ?? 1;
        const b = current[Math.min(base + 1, current.length - 1)] ?? a;
        resampled.push(a + (b - a) * frac);
      }
      return { ...p, profilePoints: resampled };
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

    const scaleMin = randomBetween(0.3, 1.2, 0.05);
    const scaleMax = randomBetween(scaleMin + 0.1, 2.1, 0.05);
    const profileCount = randomInt(3, 6);

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
    });
  };

  const displayParams = useMemo(() => params, [params]);

  return (
    <div className="app-shell">
      <main className="viewport" aria-label="Parametric tower viewport">
        <TowerScene params={displayParams} />
      </main>
      <aside className="sidebar">
        <h1>VCP</h1>
        <p>
          Adjust slab count, height, twist, taper, offsets, and gradient colors. Changes apply immediately to the 3D
          stack on the left.
        </p>
        <div className="button-row">
          <button type="button" onClick={handleRandomize}>
            Randomize
          </button>
          <button type="button" onClick={handleReset}>
            Reset
          </button>
        </div>

        <section className="profile-section">
          <h2>Profile Curve</h2>
          <p className="muted">
            Shape the tower radius along its height with graph handles and adjust how many handles you want to tweak.
          </p>
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
        </section>

        <div className="controls-grid">
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
          <label className="checkbox-row">
            <input type="checkbox" checked={params.animate} onChange={handleCheckbox("animate")} />
            <span>Animate Turntable</span>
          </label>
          <label>
            <span>Animation Speed</span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={params.animationSpeed}
              onChange={handleNumber("animationSpeed", 0, 5)}
              disabled={!params.animate}
            />
            <small>{params.animationSpeed.toFixed(1)}x</small>
          </label>
        </div>
      </aside>
    </div>
  );
}
