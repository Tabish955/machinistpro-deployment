// Re-export existing 2D and 3D shapes and coordinates
export { SHAPES_2D, SHAPE2D_MAP, SHAPE2D_GROUPS } from "./shapes2d";
export type { Shape2D, Field, GeoResult } from "./shapes2d";
export { SHAPES_3D, SHAPE3D_MAP } from "./shapes3d";
export type { Shape3D } from "./shapes3d";
export {
  distance,
  midpoint,
  slope,
  lineEquation,
  cartesianToPolar,
  polarToCartesian,
  cartesianToCylindrical,
  cylindricalToCartesian,
  cartesianToSpherical,
  sphericalToCartesian,
  distance3D,
  parsePoints,
  hasDanglingCoordinate,
  polygonStats,
} from "./coord";
export type {
  Cartesian2D,
  Cartesian3D,
  Polar,
  Cylindrical,
  Spherical,
  PolygonStats,
} from "./coord";
export { LENGTH_UNITS, UNIT_MAP, lengthFactor, dimensionOf, convertResult } from "./units";
export type { LengthUnit } from "./units";

// Export new advanced & engineering geometry solvers
export { solveSSS, solveSAS, solveASA, solveAAS, solveSSA } from "./solvers/triangle";
export { calculateBoltCircle, generateBoltCircleGCode } from "./solvers/bolt-circle";
export type { BoltCircleParams } from "./solvers/bolt-circle";
export { solveArcGeometry } from "./solvers/circle-arc";
export type { ArcInputParams } from "./solvers/circle-arc";
export { processCncCoordinates, vectorBetween } from "./solvers/cnc-coord";
export type { RawCncPoint } from "./solvers/cnc-coord";
export { calculateFillet, calculateChamfer } from "./solvers/fillet-chamfer";

// Export interactive geometry engine & renderer
export { GeometryEngine } from "./interactive/engine";
export { findSnapTarget, lineIntersection } from "./interactive/snapping";
export type { SnappingContext } from "./interactive/snapping";
export { renderInteractiveGeometry } from "./interactive/renderer";
export type { RenderInteractiveGeometryOptions } from "./interactive/renderer";

// Export types
export type {
  GeoPoint,
  GeoSegment,
  GeoLine,
  GeoCircle,
  GeoPolygon,
  GeoVector,
  GeoMeasurement,
  InteractiveGeometryScene,
  SnapTarget,
  ConstructionTool,
  BoltHoleCoordinate,
  BoltCircleResult,
  ArcGeometryResult,
  TriangleResult,
  FilletResult,
  ChamferResult,
  CncCoordinateRow,
} from "./types";
