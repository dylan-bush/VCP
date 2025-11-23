import { Leva, folder, useControls } from "leva";

import { TowerScene } from "./components/TowerScene";
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
  gradientStart: "#22aed1",
  gradientEnd: "#f26419",
};

export default function App() {
  const controls = useControls(() => ({
    Structure: folder({
      floorCount: { value: defaultParams.floorCount, min: 3, max: 120, step: 1 },
      towerHeight: { value: defaultParams.towerHeight, min: 20, max: 200, step: 1 },
      baseRadius: { value: defaultParams.baseRadius, min: 2, max: 15, step: 0.1 },
      floorThickness: { value: defaultParams.floorThickness, min: 0.2, max: 1, step: 0.05 },
    }),
    Transform: folder({
      twistMin: { value: defaultParams.twistMin, min: -180, max: 0, step: 1 },
      twistMax: { value: defaultParams.twistMax, min: 0, max: 360, step: 1 },
      scaleMin: { value: defaultParams.scaleMin, min: 0.25, max: 1.5, step: 0.05 },
      scaleMax: { value: defaultParams.scaleMax, min: 0.25, max: 2.5, step: 0.05 },
    }),
    Appearance: folder({
      gradientStart: { value: defaultParams.gradientStart },
      gradientEnd: { value: defaultParams.gradientEnd },
    }),
  })) as TowerParameters;

  return (
    <div className="app-shell">
      <main className="viewport" aria-label="Parametric tower viewport">
        <TowerScene params={controls} />
      </main>
      <aside className="sidebar">
        <h1>VCP</h1>
        <p>
          Experiment with stacked slab towers that twist, scale, and blend gradient colors. Use the slider controls to
          drive the geometry in real-time on your local browser.
        </p>
        <section>
          <h2>Workflow</h2>
          <ul>
            <li>Structure: set height, floor count, and slab thickness.</li>
            <li>Transform: define twist and taper ranges for gradient effects.</li>
            <li>Appearance: pick top/bottom colors to drive the vertical gradient.</li>
          </ul>
        </section>
        <section>
          <h2>Tips</h2>
          <ul>
            <li>Higher floor counts create smoother gradients but need more GPU power.</li>
            <li>Use a negative minimum twist for counter-rotation near the podium.</li>
            <li>Scale sliders accept asymmetric ranges for dramatic tapers.</li>
          </ul>
        </section>
      </aside>
      <Leva titleBar={{ title: "Tower Controls" }} collapsed={false} oneLineLabels />
    </div>
  );
}
