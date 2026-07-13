import path from "node:path";
import type { NextConfig } from "next";

const PLAYGROUND_DIR = path.dirname(new URL(import.meta.url).pathname);

// The API routes import detector.ts/emitter.ts from the sibling
// skills/setup/scripts/ directory (outside this app's own root) per
// SPEC-OPL-2879-playground.md. externalDir opts into resolving those, but
// is webpack-only (unsupported under Turbopack as of Next 16.1) — hence
// the --webpack flag on the dev/build scripts in package.json.
const nextConfig: NextConfig = {
  reactCompiler: false,
  images: { unoptimized: true },
  // This app has its own bun.lock alongside the monorepo's — pin the
  // tracing root here so Next doesn't guess and warn about it.
  outputFileTracingRoot: PLAYGROUND_DIR,
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
