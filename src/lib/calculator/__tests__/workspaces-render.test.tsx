import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("@/lib/next-compat", () => ({
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>,
}));

import { AdvancedWorkspace } from "@/components/calculator/advanced-workspaces";
import { PremiumCalculator } from "@/components/calculator/premium-calculator";

describe("All Calculator Workspaces Render Test", () => {
  it("renders Matrix workspace without errors", () => {
    expect(() => renderToString(<AdvancedWorkspace mode="matrix" />)).not.toThrow();
  });

  it("renders Programmer workspace without errors", () => {
    expect(() => renderToString(<AdvancedWorkspace mode="programmer" />)).not.toThrow();
  });

  it("renders Engineering workspace without errors", () => {
    expect(() => renderToString(<AdvancedWorkspace mode="engineering" />)).not.toThrow();
  });

  it("renders Statistics workspace without errors", () => {
    expect(() => renderToString(<AdvancedWorkspace mode="statistics" />)).not.toThrow();
  });

  it("renders Complex workspace without errors", () => {
    expect(() => renderToString(<AdvancedWorkspace mode="complex" />)).not.toThrow();
  });

  it("renders Equation workspace without errors", () => {
    expect(() => renderToString(<AdvancedWorkspace mode="equation" />)).not.toThrow();
  });

  it("renders Graphing workspace without errors", () => {
    expect(() => renderToString(<AdvancedWorkspace mode="graphing" />)).not.toThrow();
  });

  it("renders PremiumCalculator without errors", () => {
    expect(() => renderToString(<PremiumCalculator />)).not.toThrow();
  });
});
