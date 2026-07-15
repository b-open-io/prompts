import path from "node:path";
import type { NextConfig } from "next";

const PLAYGROUND_DIR = path.dirname(new URL(import.meta.url).pathname);
const REPOSITORY_ROOT = path.resolve(PLAYGROUND_DIR, "../../..");

// The API routes import detector.ts/emitter.ts from the sibling
// skills/setup/scripts/ directory (outside this app's own root) per
// SPEC-OPL-2879-playground.md. externalDir opts into resolving those, but
// is webpack-only (unsupported under Turbopack as of Next 16.1) — hence
// the --webpack flag on the dev/build scripts in package.json.
const nextConfig: NextConfig = {
  reactCompiler: false,
  images: { unoptimized: true },
  // Agent Master packages this app inside the signed desktop bundle. The
  // standalone server contains only the production runtime files instead of
  // requiring a plugin checkout and its complete node_modules tree.
  output: "standalone",
  // This app has its own bun.lock alongside the monorepo's — pin the
  // tracing root explicitly. The app imports its detector and launcher code
  // from skills/setup/scripts, so the trace root must include the repository.
  outputFileTracingRoot: REPOSITORY_ROOT,
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
