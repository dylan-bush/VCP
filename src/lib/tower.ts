import { Color, MathUtils } from "three";
import type { TowerParameters, TowerFloor } from "../types/tower";

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const buildTower = (params: TowerParameters) => {
  const floorCount = Math.max(1, Math.floor(params.floorCount));
  const height = Math.max(1, params.towerHeight);
  const baseRadius = Math.max(0.25, params.baseRadius);
  const floorThickness = Math.min(Math.max(params.floorThickness, 0.1), 1.0);

  const scaleStart = Math.min(params.scaleMin, params.scaleMax);
  const scaleEnd = Math.max(params.scaleMin, params.scaleMax);
  const twistStart = Math.min(params.twistMin, params.twistMax);
  const twistEnd = Math.max(params.twistMin, params.twistMax);

  const floorHeight = height / floorCount;
  const slabHeight = floorHeight * floorThickness;
  const startColor = new Color(params.gradientStart);
  const endColor = new Color(params.gradientEnd);
  const yOffset = -height / 2 + slabHeight / 2;

  const floors: TowerFloor[] = [];

  for (let i = 0; i < floorCount; i += 1) {
    const ratio = floorCount === 1 ? 1 : i / (floorCount - 1);
    const eased = easeInOut(ratio);
    const rotation = MathUtils.degToRad(lerp(twistStart, twistEnd, eased));
    const radius = baseRadius * lerp(scaleStart, scaleEnd, eased);
    const color = startColor.clone().lerp(endColor, ratio).getStyle();

    floors.push({
      index: i,
      positionY: yOffset + i * floorHeight,
      rotation,
      radius,
      color,
    });
  }

  return { floors, slabHeight, height, floorCount };
};
