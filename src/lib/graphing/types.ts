/**
 * Types for the MachinistPro Graphing Engine and UI
 */

export type AngleMode = "deg" | "rad";

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  aspectLocked: boolean;
}

export interface GraphSettings {
  angleMode: AngleMode;
  gridStyle: "cartesian" | "polar" | "none";
  showMajorGrid: boolean;
  showMinorGrid: boolean;
  showAxes: boolean;
  showAxisLabels: boolean;
  showNumbers: boolean;
  highPrecision: boolean;
}

export type GraphItemType =
  | "function"
  | "parametric"
  | "polar"
  | "implicit"
  | "inequality"
  | "slider"
  | "table"
  | "folder"
  | "note";

export interface BaseGraphItem {
  id: string;
  type: GraphItemType;
  color: string;
  visible: boolean;
  folderId?: string | null;
  error?: string | null;
}

export interface FunctionItem extends BaseGraphItem {
  type: "function";
  rawExpression: string; // e.g. "y = sin(x)", "f(x) = x^2", "x = y^2"
  domainMin?: string;
  domainMax?: string;
  isRestricted?: boolean;
}

export interface ParametricItem extends BaseGraphItem {
  type: "parametric";
  xExpr: string; // e.g. "cos(t)"
  yExpr: string; // e.g. "sin(t)"
  tMin: string; // e.g. "0"
  tMax: string; // e.g. "2*pi"
  tStep?: string;
}

export interface PolarItem extends BaseGraphItem {
  type: "polar";
  rExpr: string; // e.g. "2*sin(3*theta)"
  thetaMin: string;
  thetaMax: string;
}

export interface ImplicitItem extends BaseGraphItem {
  type: "implicit";
  rawExpression: string; // e.g. "x^2 + y^2 = 25"
}

export interface InequalityItem extends BaseGraphItem {
  type: "inequality";
  rawExpression: string; // e.g. "y >= x^2", "x^2 + y^2 < 16"
  fillOpacity?: number;
}

export interface SliderItem extends BaseGraphItem {
  type: "slider";
  variableName: string; // e.g. "a"
  value: number;
  min: number;
  max: number;
  step: number;
  isPlaying: boolean;
  playDirection: 1 | -1;
  animationSpeed: number; // 1x, 2x, etc.
}

export interface TableColumn {
  id: string;
  header: string; // e.g. "x1", "y1"
  values: (number | null)[];
}

export interface TableItem extends BaseGraphItem {
  type: "table";
  xColName: string;
  yColName: string;
  rows: { x: number | null; y: number | null }[];
  showScatter: boolean;
  joinPoints: boolean;
  regressionModel?:
    | "none"
    | "linear"
    | "quadratic"
    | "polynomial"
    | "exponential"
    | "logarithmic"
    | "power";
  polynomialDegree?: number;
  showRegressionLine?: boolean;
}

export interface FolderItem extends BaseGraphItem {
  type: "folder";
  name: string;
  collapsed: boolean;
}

export interface NoteItem extends BaseGraphItem {
  type: "note";
  text: string;
}

export type GraphItem =
  | FunctionItem
  | ParametricItem
  | PolarItem
  | ImplicitItem
  | InequalityItem
  | SliderItem
  | TableItem
  | FolderItem
  | NoteItem;

export interface SampledCurve {
  points: (Point2D | null)[];
  roots: Point2D[];
  extrema: Array<Point2D & { kind: "min" | "max" }>;
  error?: string;
}

export interface ImplicitContour {
  segments: [Point2D, Point2D][];
  error?: string;
}

export interface InequalityRegion {
  points: Point2D[];
  boundary: (Point2D | null)[];
  operator: "<" | "<=" | ">" | ">=";
  error?: string;
}

export interface TracePoint {
  x: number;
  y: number;
  slope?: number;
  tangentEquation?: string;
  normalEquation?: string;
  expressionId?: string;
  expressionLabel?: string;
}

export type RegressionModel =
  | "linear"
  | "quadratic"
  | "polynomial"
  | "exponential"
  | "logarithmic"
  | "power";

export interface RegressionResult {
  model: RegressionModel;
  equation: string;
  params: Record<string, number>;
  r2: number;
  rmse: number;
  predict: (x: number) => number;
  residuals: { x: number; y: number; yPred: number; residual: number }[];
}

export interface CalculusResult {
  derivative?: {
    expression: string;
    valueAtX?: number;
    isSymbolic: boolean;
  };
  integral?: {
    value: number;
    from: number;
    to: number;
    shadedPoints: Point2D[];
  };
  arcLength?: {
    value: number;
    from: number;
    to: number;
  };
}

export interface SessionData {
  version: string;
  items: GraphItem[];
  viewport: Viewport;
  settings: GraphSettings;
  timestamp: number;
}
