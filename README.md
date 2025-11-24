# VCP

VCP is a browser-based parametric tower generator that stacks procedural floor slabs, applies twist and taper gradients, and blends vertical color ramps so you can rapidly prototype sculptural building concepts directly in a WebGL viewport.

## Features
- Real-time Three.js viewport powered by react-three-fiber with orbit navigation and stats overlay.
- Gradient-based twisting, scaling, and coloration across any number of floors with responsive slider controls.
- Native control panel (no external UI lib) for geometry, appearance, animation, and proportions with live updates.
- Randomize/reset utilities to explore quick design variations plus optional turntable animation controls.
- Modular TypeScript code structure with reusable tower math utilities for future expansion.

## Getting Started
1. Install dependencies: `npm install`.
2. Launch the local dev server: `npm run dev`.
3. Open the printed localhost URL (typically http://localhost:5173) in your browser and start adjusting sliders.

## Controls
- **Structure** - Set floor count, total height, base radius, and the relative thickness of each slab.
- **Transform** - Define minimum/maximum twist (degrees) and min/max scale factors for smooth tapers.
- **Appearance** - Pick bottom and top colors to drive the vertical gradient across the tower.
- **Animation** - Enable/disable turntable motion and adjust the spin speed for presentations.
- **Randomize / Reset** - Buttons in the sidebar seed curated parameter ranges or return to defaults.
- **Viewport** - Drag with your mouse (OrbitControls) to tumble, right-click to pan, and scroll to dolly in/out.
