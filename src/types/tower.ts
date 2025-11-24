export type TowerParameters = {
  floorCount: number;
  towerHeight: number;
  baseRadius: number;
  twistMin: number;
  twistMax: number;
  scaleMin: number;
  scaleMax: number;
  floorThickness: number;
  gradientStart: string;
  gradientEnd: string;
  animate: boolean;
  animationSpeed: number;
};

export type TowerFloor = {
  index: number;
  positionY: number;
  rotation: number;
  radius: number;
  color: string;
  offsetX: number;
  offsetZ: number;
  scaleX: number;
  scaleZ: number;
};
