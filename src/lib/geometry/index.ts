export { SHAPES_2D, SHAPE2D_MAP, SHAPE2D_GROUPS } from "./shapes2d";
export type { Shape2D, Field, GeoResult } from "./shapes2d";
export { SHAPES_3D, SHAPE3D_MAP } from "./shapes3d";
export type { Shape3D } from "./shapes3d";
export {
  distance, midpoint, slope, lineEquation,
  cartesianToPolar, polarToCartesian,
  cartesianToCylindrical, cylindricalToCartesian,
  cartesianToSpherical, sphericalToCartesian,
  distance3D, parsePoints, hasDanglingCoordinate, polygonStats,
} from "./coord";
export type {
  Cartesian2D, Cartesian3D, Polar, Cylindrical, Spherical, PolygonStats,
} from "./coord";
export { LENGTH_UNITS, UNIT_MAP, lengthFactor, dimensionOf, convertResult } from "./units";
export type { LengthUnit } from "./units";
