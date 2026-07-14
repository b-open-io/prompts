#!/usr/bin/env bun
// bopen-setup installer server (OPL-2850, Unit B). Never writes anything;
// POST /api/plan returns a complete generated prompt — see
// SPEC-OPL-2850-CONTRACTS.md for the HTTP contract this implements.

import { join } from "node:path";
import { detectHarness, fetchMarketplaceCatalog, type PlanSelections } from "./detector";
import { isRuntime, RUNTIME_IDS, type Runtime } from "./runtimes";

function usage(): never {
  console.error(`Usage: bun server.ts --runtime <${RUNTIME_IDS.join("|")}> [--port <number>]`);
  process.exit(1);
}

function parseArgs(argv: string[]): { runtime: Runtime; port: number } {
  let runtime: string | undefined;
  let port = 7788;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--runtime") {
      runtime = argv[++i];
    } else if (argv[i] === "--port") {
      const raw = argv[++i];
      const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
      if (Number.isNaN(parsed)) usage();
      port = parsed;
    }
  }

  if (!runtime || !isRuntime(runtime)) usage();
  return { runtime, port };
}

function isPlanSelections(body: unknown): body is PlanSelections {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.runtime !== "string" || !isRuntime(candidate.runtime)) return false;
  if (!Array.isArray(candidate.plugins)) return false;

  return candidate.plugins.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const plugin = entry as Record<string, unknown>;
    return (
      typeof plugin.name === "string" &&
      typeof plugin.installPlugin === "boolean" &&
      Array.isArray(plugin.checks) &&
      plugin.checks.every((c) => typeof c === "string") &&
      typeof plugin.hooks === "object" &&
      plugin.hooks !== null &&
      !Array.isArray(plugin.hooks)
    );
  });
}

const { runtime, port } = parseArgs(process.argv.slice(2));
const uiPath = join(import.meta.dir, "..", "assets", "ui.html");

// Fetched once at boot per the caching contract; /api/state reuses this
// snapshot but re-runs every other check live on each call.
const marketplaceCache = await fetchMarketplaceCatalog();

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      try {
        const html = await Bun.file(uiPath).text();
        return new Response(html, { headers: { "content-type": "text/html" } });
      } catch (err) {
        return new Response(`ui.html not found at ${uiPath}: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      const state = await detectHarness({ runtimeArg: runtime, marketplaceCache });
      return Response.json(state);
    }

    if (req.method === "POST" && url.pathname === "/api/plan") {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return Response.json({ error: "malformed JSON body" }, { status: 400 });
      }
      if (!isPlanSelections(body)) {
        return Response.json({ error: "body does not match PlanSelections" }, { status: 400 });
      }

      // Conditional import: emitter.ts is Unit D's file and may not exist
      // yet. This keeps GET /api/state bootable and testable independent of
      // that sibling unit landing; only this route depends on it.
      const { emitPlan } = await import("./emitter");
      const state = await detectHarness({ runtimeArg: runtime, marketplaceCache });
      const markdown = emitPlan(state, body);
      return Response.json({ markdown });
    }

    return new Response("not found", { status: 404 });
  },
});

const bootState = await detectHarness({ runtimeArg: runtime, marketplaceCache });
console.log(`bopen-setup server: http://127.0.0.1:${port}`);
console.log(`runtime arg: ${runtime} | detected: ${bootState.runtimeDetected} | plugins: ${bootState.plugins.length}`);
