/**
 * Both `formulas` and `edm` export a `fmt`, so this barrel re-exports the
 * electrical side flat and keeps EDM behind a namespace rather than letting
 * one `fmt` quietly shadow the other.
 */
export * from "./formulas";
export * from "./tables";
export * from "./sizing";
export * as edm from "./edm";
