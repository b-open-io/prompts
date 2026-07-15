#!/usr/bin/env bun
// bopen-setup playground launcher (OPL-2879). Builds and starts the Next.js
// playground app at skills/setup/playground/, passing the runtime through
// as BOPEN_SETUP_RUNTIME so the app's route handlers can read it (see
// src/app/api/state/route.ts and api/plan/route.ts). Never installs
// anything except this app's own dependencies; mirrors the gemskills
// playground_server.ts launcher shape (bun check, install-if-missing,
// build-if-missing, start).

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isRuntime, RUNTIME_IDS, type Runtime } from "./runtimes";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAYGROUND_DIR = resolve(__dirname, "..", "playground");

function usage(): never {
  console.error(`Usage: bun skills/setup/scripts/playground_server.ts --runtime <${RUNTIME_IDS.join("|")}> [--port <number>] [--pack <toc.json|pack.json>] [--rebuild] [--agent-master]`);
  process.exit(1);
}

function parseArgs(argv: string[]): { runtime: Runtime; port: number; packPath?: string; rebuild: boolean; agentMaster: boolean } {
  let runtime: string | undefined;
  let port = Number.parseInt(process.env.PORT || "7788", 10);
  let rebuild = false;
  let agentMaster = false;
  let packPath: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--runtime") {
      runtime = argv[++i];
    } else if (argv[i] === "--port") {
      const raw = argv[++i];
      const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
      if (Number.isNaN(parsed)) usage();
      port = parsed;
    } else if (argv[i] === "--rebuild") {
      rebuild = true;
    } else if (argv[i] === "--agent-master") {
      agentMaster = true;
    } else if (argv[i] === "--pack") {
      const raw = argv[++i];
      if (!raw) usage();
      packPath = resolve(raw);
    }
  }

  if (!runtime || !isRuntime(runtime) || !Number.isInteger(port) || port < 1 || port > 65535) usage();
  if (packPath && !existsSync(packPath)) {
    console.error(`Pack input not found: ${packPath}`);
    process.exit(1);
  }
  return { runtime, port, packPath, rebuild, agentMaster };
}

function checkBun(): void {
  const check = Bun.spawnSync(["bun", "--version"], { stdout: "pipe", stderr: "pipe" });
  if (check.exitCode !== 0) {
    console.error("bun is required to run the playground but was not found on PATH.");
    process.exit(1);
  }
}

function run(cmd: string[], cwd: string, env?: Record<string, string | undefined>): void {
  const proc = Bun.spawnSync(cmd, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: ["inherit", "inherit", "inherit"],
  });
  if (proc.exitCode !== 0) {
    console.error(`Command failed (exit ${proc.exitCode}): ${cmd.join(" ")}`);
    process.exit(proc.exitCode ?? 1);
  }
}

const { runtime, port, packPath, rebuild, agentMaster } = parseArgs(process.argv.slice(2));

checkBun();

const nodeModulesPath = join(PLAYGROUND_DIR, "node_modules");
if (!existsSync(nodeModulesPath)) {
  console.error("Installing playground dependencies (bun install)...");
  run(["bun", "install"], PLAYGROUND_DIR);
}

const nextBuildPath = join(PLAYGROUND_DIR, ".next");
if (rebuild || !existsSync(nextBuildPath)) {
  // --webpack: the API routes import detector.ts/emitter.ts from outside
  // this app's root (skills/setup/scripts/) via experimental.externalDir,
  // which Next 16.1's Turbopack does not support — see next.config.ts.
  console.error("Building playground (bun --bun next build --webpack)...");
  run(["bun", "--bun", "next", "build", "--webpack"], PLAYGROUND_DIR);
}

const host = process.env.HOST || "127.0.0.1";
const browserUrl = process.env.PORTLESS_URL || `http://${host}:${port}`;
console.error(`bopen-setup playground: ${browserUrl}`);
console.error(`runtime arg: ${runtime}`);
if (agentMaster) console.error("Agent Master broker: enabled");

const proc = Bun.spawn(["bun", "--bun", "next", "start", "-H", host, "-p", String(port)], {
  cwd: PLAYGROUND_DIR,
  env: {
    ...process.env,
    BOPEN_SETUP_RUNTIME: runtime,
    BOPEN_SETUP_PACK: packPath,
    BOPEN_AGENT_MASTER: agentMaster ? "1" : undefined,
  },
  stdio: ["inherit", "inherit", "inherit"],
});

function cleanup() {
  proc.kill("SIGTERM");
  process.exit(0);
}
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

await proc.exited;
