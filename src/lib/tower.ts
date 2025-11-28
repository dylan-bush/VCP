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
  const rawSlabSides = toFiniteNumber(params.slabSides, 4);
  const rawScaleMin = toFiniteNumber(params.scaleMin, 0.8);
  const rawScaleMax = toFiniteNumber(params.scaleMax, 1.2);
  const rawTwistMin = toFiniteNumber(params.twistMin, -10);
  const rawTwistMax = toFiniteNumber(params.twistMax, 120);
  const rawProfilePoints =
    Array.isArray(params.profilePoints) && params.profilePoints.length > 0 ? params.profilePoints : [1];
  const rawFloorProfilePoints =
    Array.isArray(params.floorProfilePoints) && params.floorProfilePoints.length > 0 ? params.floorProfilePoints : [1];

  const floorCount = Math.max(1, Math.floor(rawFloorCount));
  const height = Math.max(1, rawHeight);
  const baseRadius = Math.max(0.25, rawRadius);
  const floorThickness = Math.min(Math.max(rawThickness, 0.1), 1.0);
  const slabSides = Math.min(Math.max(Math.floor(rawSlabSides), 3), 48);

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
  const profilePoints = rawProfilePoints.map((v) => Math.min(Math.max(v, 0.25), 2.25));
  const floorProfilePoints = rawFloorProfilePoints.map((v) => Math.min(Math.max(v, 0.6), 1.4));
  const profileSampler = (t: number) => {
    if (profilePoints.length === 1) return profilePoints[0];
    const clamped = Math.min(Math.max(t, 0), 1) * (profilePoints.length - 1);
    const index = Math.floor(clamped);
    const frac = clamped - index;
    const a = profilePoints[index];
    const b = profilePoints[Math.min(index + 1, profilePoints.length - 1)];
    return lerp(a, b, frac);
  };
  const floorProfileSampler = (t: number) => {
    if (floorProfilePoints.length === 1) return floorProfilePoints[0];
    const clamped = Math.min(Math.max(t, 0), 1) * (floorProfilePoints.length - 1);
    const index = Math.floor(clamped);
    const frac = clamped - index;
    const a = floorProfilePoints[index];
    const b = floorProfilePoints[Math.min(index + 1, floorProfilePoints.length - 1)];
    return lerp(a, b, frac);
  };

  const floors: TowerFloor[] = [];

  for (let i = 0; i < floorCount; i += 1) {
    const ratio = floorCount === 1 ? 1 : i / (floorCount - 1);
    const eased = easeInOut(ratio);
    const rotation = MathUtils.degToRad(lerp(twistStart, twistEnd, eased));
    const radiusScale = Math.min(Math.max(lerp(scaleStart, scaleEnd, eased) * profileSampler(eased), 0.15), 3);
    const aspect = Math.min(Math.max(floorProfileSampler(eased), 0.6), 1.4);
    const radius = baseRadius * radiusScale;
    const color = startColor.clone().lerp(endColor, ratio).getStyle();

    const wobble = Math.sin(ratio * Math.PI * 2);
    const wobble2 = Math.cos(ratio * Math.PI * 1.5 + Math.PI / 3);
    const offsetX = Math.cos(rotation) * driftRadius * wobble;
    const offsetZ = Math.sin(rotation) * driftRadius * wobble2;
    const scaleX = radius * aspect;
    const scaleZ = radius * Math.max(0.5, 2 - aspect) * (0.85 + Math.abs(wobble) * 0.25);

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
      sides: slabSides,
    });
  }

  return { floors, slabHeight, height, floorCount, baseRadius, slabSides };
};
