import { Color, MathUtils } from "three";
import type { TowerFloor, TowerParameters } from "../types/tower";

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const toFiniteNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const buildTower = (params: TowerParameters) => {
  const rawFloorCount = toFiniteNumber(params.floorCount, 1);
  const rawHeight = toFiniteNumber(params.towerHeight, 40);
  const rawRadius = toFiniteNumber(params.baseRadius, 4);
  const rawThickness = toFiniteNumber(params.floorThickness, 0.5);
  const rawScaleMin = toFiniteNumber(params.scaleMin, 0.8);
  const rawScaleMax = toFiniteNumber(params.scaleMax, 1.2);
  const rawTwistMin = toFiniteNumber(params.twistMin, -10);
  const rawTwistMax = toFiniteNumber(params.twistMax, 120);

  const floorCount = Math.max(1, Math.floor(rawFloorCount));
  const height = Math.max(1, rawHeight);
  const baseRadius = Math.max(0.25, rawRadius);
  const floorThickness = Math.min(Math.max(rawThickness, 0.1), 1.0);

  const scaleStart = Math.min(rawScaleMin, rawScaleMax);
  const scaleEnd = Math.max(rawScaleMin, rawScaleMax);
  const twistStart = Math.min(rawTwistMin, rawTwistMax);
  const twistEnd = Math.max(rawTwistMin, rawTwistMax);

  const floorHeight = height / floorCount;
  const slabHeight = floorHeight * floorThickness;
  const startColor = new Color(params.gradientStart);
  const endColor = new Color(params.gradientEnd);
  const yOffset = -height / 2 + slabHeight / 2;
  const driftRadius = baseRadius * 0.25;

  const floors: TowerFloor[] = [];

  for (let i = 0; i < floorCount; i += 1) {
    const ratio = floorCount === 1 ? 1 : i / (floorCount - 1);
    const eased = easeInOut(ratio);
    const rotation = MathUtils.degToRad(lerp(twistStart, twistEnd, eased));
    const radiusScale = Math.max(0.15, lerp(scaleStart, scaleEnd, eased));
    const radius = baseRadius * radiusScale;
    const color = startColor.clone().lerp(endColor, ratio).getStyle();

    const wobble = Math.sin(ratio * Math.PI * 2);
    const wobble2 = Math.cos(ratio * Math.PI * 1.5 + Math.PI / 3);
    const offsetX = Math.cos(rotation) * driftRadius * wobble;
    const offsetZ = Math.sin(rotation) * driftRadius * wobble2;
    const scaleX = radius;
    const scaleZ = radius * (0.7 + Math.abs(wobble) * 0.6);

    floors.push({
      index: i,
      positionY: yOffset + i * floorHeight,
      rotation,
      radius,
      color,
      offsetX,
      offsetZ,
      scaleX,
      scaleZ,
    });
  }

  return { floors, slabHeight, height, floorCount, baseRadius };
};
