/**
 * Types for Interactive Geometry and Engineering Solvers
 */

export interface GeoPoint {
  id: string;
  name?: string;
  x: number;
  y: number;
  isFixed?: boolean;
  color?: string;
}

export type ConstructionTool =
  | "select"
  | "point"
  | "segment"
  | "line"
  | "ray"
  | "circle_center_point"
  | "circle_3pt"
  | "polygon"
  | "vector"
  | "midpoint"
  | "perpendicular"
  | "parallel"
  | "angle_bisector"
  | "tangent"
  | "distance"
  | "angle"
  | "area";

export interface GeoSegment {
  id: string;
  p1Id: string;
  p2Id: string;
  color?: string;
  label?: string;
}

export interface GeoLine {
  id: string;
  p1Id: string;
  p2Id: string;
  type: "infinite" | "ray";
  color?: string;
}

export interface GeoCircle {
  id: string;
  centerId: string;
  radiusPointId?: string;
  radiusValue?: number;
  through3Points?: [string, string, string];
  color?: string;
}

export interface GeoPolygon {
  id: string;
  pointIds: string[];
  color?: string;
  fillColor?: string;
}

export interface GeoVector {
  id: string;
  fromId: string;
  toId: string;
  color?: string;
}

export interface GeoMeasurement {
  id: string;
  type: "distance" | "angle" | "area" | "perimeter" | "slope" | "radius";
  targetIds: string[];
  value: number;
  label: string;
  unit: string;
}

export interface InteractiveGeometryScene {
  points: GeoPoint[];
  segments: GeoSegment[];
  lines: GeoLine[];
  circles: GeoCircle[];
  polygons: GeoPolygon[];
  vectors: GeoVector[];
  measurements: GeoMeasurement[];
}

export interface SnapTarget {
  x: number;
  y: number;
  type: "point" | "grid" | "intersection" | "midpoint" | "perpendicular" | "parallel" | "tangent";
  targetId?: string;
  label?: string;
}

// PCD Bolt Circle Result
export interface BoltHoleCoordinate {
  index: number;
  angleDeg: number;
  x: number;
  y: number;
  distanceFromOrigin: number;
  chordDistanceToNext: number;
}

export interface BoltCircleResult {
  pcd: number;
  radius: number;
  holeCount: number;
  startAngleDeg: number;
  angularStepDeg: number;
  centerX: number;
  centerY: number;
  holes: BoltHoleCoordinate[];
  chordLength: number;
  circumference: number;
}

// Arc Geometry Result
export interface ArcGeometryResult {
  radius: number;
  diameter: number;
  chord: number;
  sagitta: number;
  includedAngleDeg: number;
  includedAngleRad: number;
  arcLength: number;
  sectorArea: number;
  segmentArea: number;
  triangleArea: number;
}

// Triangle Solver Result
export interface TriangleResult {
  a: number;
  b: number;
  c: number;
  alphaDeg: number; // Angle opposite to a
  betaDeg: number; // Angle opposite to b
  gammaDeg: number; // Angle opposite to c
  area: number;
  perimeter: number;
  semiperimeter: number;
  altitudeA: number;
  altitudeB: number;
  altitudeC: number;
  medianA: number;
  medianB: number;
  medianC: number;
  inradius: number;
  circumradius: number;
  isRight: boolean;
  isEquilateral: boolean;
  isIsosceles: boolean;
  typeDescription: string;
}

// Fillet and Chamfer Result
export interface FilletResult {
  cornerAngleDeg: number;
  radius: number;
  tangentSetback: number;
  arcCenterOffset: number;
  arcLength: number;
  chordLength: number;
  cutArea: number;
}

export interface ChamferResult {
  setbackX: number;
  setbackY: number;
  angleDeg: number;
  hypotenuseLength: number;
  cutArea: number;
  toolDepthOffset?: number;
}

// CNC Coordinates
export interface CncCoordinateRow {
  index: number;
  xAbs: number;
  yAbs: number;
  xInc: number;
  yInc: number;
  radius: number;
  angleDeg: number;
  distanceFromPrev: number;
  commandType: "G00" | "G01" | "G02" | "G03";
}
