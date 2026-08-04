// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // NOTE: do NOT hardcode a nitro preset here. Lovable hosting builds for
  // Cloudflare Workers; forcing "vercel" made published deploys silently keep
  // serving the previous build. For a Vercel deploy, set NITRO_PRESET=vercel
  // in the Vercel project env instead.
  ...(process.env.NITRO_PRESET ? { nitro: { preset: process.env.NITRO_PRESET } } : {}),
});
