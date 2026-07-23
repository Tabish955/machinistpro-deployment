"use client";

import { CustomCursor } from "./custom-cursor";
import { SplashLoader } from "./splash-loader";
import { CopyProtection } from "./copy-protection";

/**
 * Client-side providers and global UI elements.
 * Mounted once in the root layout.
 */
export function ClientProviders() {
  return (
    <>
      <SplashLoader />
      <CustomCursor />
      <CopyProtection />
    </>
  );
}
