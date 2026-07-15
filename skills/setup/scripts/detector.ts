// Detector for the bopen-setup installer (OPL-2850, Unit B).
// Read-only: every check here shells out or reads the filesystem/network,
// never writes. See SPEC-OPL-2850-CONTRACTS.md for the pinned shared types.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { type CatalogPlugin, loadPackState, type PackState } from "./pack";
import type { Runtime } from "./runtimes";

export type { Runtime } from "./runtimes";

export type CheckKind = "cli" | "env" | "third-party-skill" | "codex-agents" | "setup-script";

export type CheckState = {
  id: string;
  kind: CheckKind;
  name: string;
  installed: boolean;
  detail?: string;
  install?: string;
  installNote?: string;
  checkCommand?: string;
  usedBy?: string[];
  obtain?: string;
};

export type HookState = {
  name: string;
  enabled: boolean;
  summary: string;
  runtimes: string[];
};

export type SkillActivityState = {
  lastInvokedAt: number;
  sessionId: string;
  count24h: number;
  isLive: boolean;
};

export type SkillActivityMap = Record<string, SkillActivityState>;

export type PluginState = {
  name: string;
  installedClaude: string | null;
  installedCodex: string | null;
  marketplaceVersion: string | null;
  hasSetupManifest: boolean;
  checks: CheckState[];
  hooks: HookState[];
  hooksConfigPath: string | null;
  skillActivity?: SkillActivityMap;
};

export type HarnessState = {
  runtimeArg: Runtime;
  runtimeDetected: Runtime;
  platform: "darwin" | "linux" | "win32";
  generatedAt: string;
  plugins: PluginState[];
  portableSkills: string[];
  pack: PackState | null;
  marketplace: { fetched: boolean; error: string | null; fetchedAt: string | null };
};

export type PlanSelections = {
  runtime: Runtime;
  plugins: Array<{
    name: string;
    installPlugin: boolean;
    checks: string[];
    hooks: Record<string, boolean>;
  }>;
};

const DEFAULT_MARKETPLACE_URL = "https://bopen.ai/api/marketplace";
const COMMAND_TIMEOUT_MS = 5000;
const MARKETPLACE_TIMEOUT_MS = 10_000;

const CLAUDE_PLUGIN_CACHE = join(homedir(), ".claude", "plugins", "cache");
const CODEX_PLUGIN_CACHE = join(homedir(), ".codex", "plugins", "cache");
const PORTABLE_SKILL_ROOTS = [
  join(homedir(), ".agents", "skills"),
  join(homedir(), ".claude", "skills"),
  join(homedir(), ".codex", "skills"),
];
const DEFAULT_SKILL_ACTIVITY_FILE = join(homedir(), ".claude", "bopen-tools", "skill-activity.jsonl");
const DEFAULT_CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");
const DAY_SECONDS = 24 * 60 * 60;
const LIVE_SESSION_SECONDS = 120;

function isSessionLive(
  projectsDir: string,
  sessionId: string,
  nowSeconds: number,
): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) return false;

  let projectSlugs: string[];
  try {
    projectSlugs = readdirSync(projectsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return false;
  }

  for (const slug of projectSlugs) {
    try {
      const modifiedAt = statSync(join(projectsDir, slug, `${sessionId}.jsonl`)).mtimeMs / 1000;
      const age = nowSeconds - modifiedAt;
      if (age >= 0 && age <= LIVE_SESSION_SECONDS) return true;
    } catch {
      // This project slug does not contain the session transcript.
    }
  }
  return false;
}

export function readSkillActivity(opts?: {
  env?: Record<string, string | undefined>;
  nowSeconds?: number;
}): SkillActivityMap {
  const env = opts?.env ?? process.env;
  const activityPath = env.BOPEN_SKILL_ACTIVITY_FILE || DEFAULT_SKILL_ACTIVITY_FILE;
  const projectsDir = env.BOPEN_CLAUDE_PROJECTS_DIR || DEFAULT_CLAUDE_PROJECTS_DIR;
  const nowSeconds = opts?.nowSeconds ?? Math.floor(Date.now() / 1000);
  const cutoff = nowSeconds - DAY_SECONDS;
  const activity: SkillActivityMap = {};

  let contents: string;
  try {
    contents = readFileSync(activityPath, "utf8");
  } catch {
    return activity;
  }

  for (const line of contents.split("\n")) {
    if (!line.trim()) continue;

    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }

    if (!record || typeof record !== "object") continue;
    const { ts, session_id: sessionId, skill } = record as {
      ts?: unknown;
      session_id?: unknown;
      skill?: unknown;
    };
    if (!Number.isFinite(ts) || (ts as number) < 0 || typeof sessionId !== "string" || typeof skill !== "string" || skill.length === 0) {
      continue;
    }

    const timestamp = ts as number;
    const existing = activity[skill];
    if (!existing) {
      activity[skill] = {
        lastInvokedAt: timestamp,
        sessionId,
        count24h: timestamp >= cutoff && timestamp <= nowSeconds ? 1 : 0,
        isLive: false,
      };
      continue;
    }

    if (timestamp >= existing.lastInvokedAt) {
      existing.lastInvokedAt = timestamp;
      existing.sessionId = sessionId;
    }
    if (timestamp >= cutoff && timestamp <= nowSeconds) existing.count24h += 1;
  }

  const liveBySession = new Map<string, boolean>();
  for (const entry of Object.values(activity)) {
    let isLive = liveBySession.get(entry.sessionId);
    if (isLive === undefined) {
      isLive = isSessionLive(projectsDir, entry.sessionId, nowSeconds);
      liveBySession.set(entry.sessionId, isLive);
    }
    entry.isLive = isLive;
  }

  return activity;
}

function filterSkillActivityForPlugin(activity: SkillActivityMap, pluginName: string): SkillActivityMap {
  const prefix = `${pluginName}:`;
  return Object.fromEntries(Object.entries(activity).filter(([skillId]) => skillId.startsWith(prefix)));
}

function expandHome(pattern: string): string {
  if (pattern === "~") return homedir();
  if (pattern.startsWith("~/")) return `${homedir()}${pattern.slice(1)}`;
  return pattern;
}

// Bun.Glob.scan walks from `cwd` via readdir, which does not transparently
// resolve symlinked ancestor directories (e.g. macOS /var -> /private/var)
// the way passing the same absolute path straight to fs calls does. Splitting
// off the longest wildcard-free prefix and using *that* as cwd sidesteps it,
// since the symlink gets resolved once by the initial directory open rather
// than while walking through "/" as a synthetic root.
function splitGlobPrefix(pattern: string): { cwd: string; rest: string } {
  const metaIndex = pattern.search(/[*?[{]/);
  const staticPart = metaIndex === -1 ? pattern : pattern.slice(0, metaIndex);
  const lastSlash = staticPart.lastIndexOf("/");
  const cwd = lastSlash <= 0 ? "/" : staticPart.slice(0, lastSlash);
  const rest = pattern.slice(cwd.length).replace(/^\/+/, "");
  return { cwd, rest };
}

async function globExists(absolutePath: string): Promise<boolean> {
  const { cwd, rest } = splitGlobPrefix(absolutePath);
  if (!rest) return existsSync(absolutePath);

  const glob = new Bun.Glob(rest);
  for await (const _ of glob.scan({ cwd, onlyFiles: false })) {
    return true;
  }
  return false;
}

export async function evaluateCheck(
  check: string,
  opts?: { env?: Record<string, string | undefined> }
): Promise<{ installed: boolean; detail?: string }> {
  if (check.startsWith("env:")) {
    const key = check.slice(4);
    const env = opts?.env ?? process.env;
    const value = env[key];
    // Never surface the value itself — presence only.
    return { installed: typeof value === "string" && value.length > 0 };
  }

  if (check.startsWith("path:")) {
    const pattern = expandHome(check.slice(5));
    const found = await globExists(pattern);
    return found ? { installed: true, detail: pattern } : { installed: false, detail: `no match for ${pattern}` };
  }

  try {
    const proc = Bun.spawn(["sh", "-c", check], {
      stdout: "pipe",
      stderr: "pipe",
      timeout: COMMAND_TIMEOUT_MS,
    });
    const exitCode = await proc.exited;

    if (proc.signalCode) {
      return { installed: false, detail: `killed by ${proc.signalCode} (timed out after ${COMMAND_TIMEOUT_MS}ms): ${check}` };
    }

    if (exitCode !== 0) {
      const stderr = (await new Response(proc.stderr).text()).trim();
      return { installed: false, detail: stderr || `exit code ${exitCode}` };
    }

    const stdout = (await new Response(proc.stdout).text()).trim();
    return { installed: true, detail: stdout || undefined };
  } catch (err) {
    return { installed: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

function isSet(value: string | undefined): boolean {
  return typeof value === "string" && value.length > 0;
}

function isOnPath(bin: string, pathVar: string): boolean {
  return pathVar
    .split(":")
    .filter(Boolean)
    .some((dir) => existsSync(join(dir, bin)));
}

// Two signal tiers that answer different questions: live signals (env vars)
// prove which runtime is the RUNNING parent; static signals (files/binaries
// on disk) only prove something is INSTALLED — a machine can have grok
// installed while running under a Claude Code session. Live always wins:
// exactly one live signal picks that runtime regardless of static signals;
// multiple live signals (or zero live + multiple static) is an unresolvable
// conflict → "generic"; zero live + exactly one static → that static runtime.
//
// Codex's "parent chain contains codex" signal requires walking the process
// tree, which this sync, env-driven function deliberately does not do —
// detection here is limited to the env-var signals from the runtime matrix.
// `env`, when passed, is used as-is (not merged with the real process.env)
// so callers — tests in particular — get deterministic signal isolation
// regardless of what the actual host/harness environment happens to set.
// `staticSignals`, when passed, overrides the grok/hermes presence checks
// outright so tests never need to stat the real home directory or PATH.
export function detectRuntime(
  env?: Record<string, string | undefined>,
  staticSignals?: { grokPresent?: boolean; hermesPresent?: boolean }
): Runtime {
  const effective = env ?? (process.env as Record<string, string | undefined>);

  const live: Runtime[] = [];
  if (isSet(effective.CLAUDECODE)) live.push("claude");
  if (isSet(effective.CODEX_SANDBOX) || isSet(effective.CODEX_HOME)) live.push("codex");
  if (isSet(effective.OPENCODE) || isSet(effective.AGENT)) live.push("opencode");

  const uniqueLive = [...new Set(live)];
  if (uniqueLive.length === 1) return uniqueLive[0] as Runtime;
  if (uniqueLive.length > 1) return "generic";

  const home = effective.HOME ?? homedir();
  const path = effective.PATH ?? "";
  const grokPresent = staticSignals?.grokPresent ?? (existsSync(join(home, ".grok", "config.toml")) && isOnPath("grok", path));
  const hermesPresent = staticSignals?.hermesPresent ?? (isOnPath("hermes", path) && existsSync(join(home, ".hermes")));

  const staticHits: Runtime[] = [];
  if (grokPresent) staticHits.push("grok");
  if (hermesPresent) staticHits.push("hermes");

  return staticHits.length === 1 ? (staticHits[0] as Runtime) : "generic";
}

// --- Hook enable/disable resolution (hook-manager semantics) ---

export function resolveHookConfigPaths(env: Record<string, string | undefined> = process.env): string[] {
  return [env.BOPEN_HOOKS_CONFIG, join(process.cwd(), ".claude", "bopen-hooks.json"), join(homedir(), ".claude", "bopen-tools", "hooks-config.json")].filter(
    (p): p is string => Boolean(p)
  );
}

// A hook is disabled ONLY by an explicit `false` for its name in the
// highest-precedence config file that defines that key. Missing files,
// missing keys, and unreadable JSON all mean enabled.
export function resolveHookEnabled(name: string, configPaths: string[]): boolean {
  for (const cfgPath of configPaths) {
    try {
      const parsed = JSON.parse(readFileSync(cfgPath, "utf8")) as { hooks?: Record<string, boolean> };
      const verdict = parsed.hooks?.[name];
      if (typeof verdict === "boolean") return verdict;
    } catch {
      // missing file, unreadable, or malformed JSON — fall through to the next source
    }
  }
  return true;
}

type HooksManifest = { hooks?: Array<{ name: string; summary: string; runtimes: string[] }> };

async function loadHookStates(pluginRoot: string): Promise<HookState[]> {
  let manifest: HooksManifest;
  try {
    manifest = JSON.parse(await readFile(join(pluginRoot, "hooks", "manifest.json"), "utf8"));
  } catch {
    return [];
  }

  const configPaths = resolveHookConfigPaths();
  return (manifest.hooks ?? []).map((hook) => ({
    name: hook.name,
    enabled: resolveHookEnabled(hook.name, configPaths),
    summary: hook.summary,
    runtimes: hook.runtimes,
  }));
}

// --- Per-plugin setup manifest evaluation ---

type SetupManifest = {
  plugin?: string;
  clis?: Array<{ name: string; usedBy?: string[]; check: string; install?: Record<string, string> }>;
  env?: Array<{ key: string; usedBy?: string[]; obtain?: string }>;
  thirdPartySkills?: Array<{ name: string; source?: string; check: string; install?: string }>;
  agents?: Record<string, "bundled" | { script: string; check: string }>;
  hooks?: { manifest?: string; config?: string };
  skillSetupScripts?: Array<{ skill: string; script: string; purpose?: string }>;
};

// Resolves a per-platform install command map to a single command: exact
// platform match, then "any", then — if neither exists but some other
// platform's command does — that command plus a note flagging it needs
// adapting, rather than silently omitting an install hint altogether.
export function resolveInstall(installMap: Record<string, string> | undefined, platform: string): { install?: string; installNote?: string } {
  if (!installMap) return {};
  if (installMap[platform]) return { install: installMap[platform] };
  if (installMap.any) return { install: installMap.any };

  const otherPlatform = Object.keys(installMap)[0];
  if (otherPlatform) {
    return {
      install: installMap[otherPlatform],
      installNote: `${otherPlatform} command; adapt for ${platform}`,
    };
  }

  return {};
}

async function evaluateManifestChecks(manifestPath: string, platform: string): Promise<{ checks: CheckState[]; hooksConfigPath: string | null }> {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as SetupManifest;
  const checks: CheckState[] = [];

  await Promise.all(
    (manifest.clis ?? []).map(async (cli) => {
      const evaluated = await evaluateCheck(cli.check);
      const { install, installNote } = resolveInstall(cli.install, platform);
      checks.push({
        id: `cli:${cli.name}`,
        kind: "cli",
        name: cli.name,
        installed: evaluated.installed,
        detail: evaluated.detail,
        install,
        installNote,
        checkCommand: cli.check,
        usedBy: cli.usedBy,
      });
    })
  );

  await Promise.all(
    (manifest.env ?? []).map(async (envEntry) => {
      const checkCommand = `env:${envEntry.key}`;
      const evaluated = await evaluateCheck(checkCommand);
      checks.push({
        id: `env:${envEntry.key}`,
        kind: "env",
        name: envEntry.key,
        installed: evaluated.installed,
        checkCommand,
        usedBy: envEntry.usedBy,
        obtain: envEntry.obtain,
      });
    })
  );

  await Promise.all(
    (manifest.thirdPartySkills ?? []).map(async (skill) => {
      const evaluated = await evaluateCheck(skill.check);
      checks.push({
        id: `third-party-skill:${skill.name}`,
        kind: "third-party-skill",
        name: skill.name,
        installed: evaluated.installed,
        detail: evaluated.detail,
        install: skill.install,
        checkCommand: skill.check,
      });
    })
  );

  const codexAgent = manifest.agents?.codex;
  if (codexAgent && codexAgent !== "bundled") {
    const evaluated = await evaluateCheck(codexAgent.check);
    checks.push({
      id: "codex-agents",
      kind: "codex-agents",
      name: "codex agent delivery",
      installed: evaluated.installed,
      detail: evaluated.detail,
      install: `bash ${codexAgent.script}`,
      checkCommand: codexAgent.check,
    });
  }

  // No declared check exists for a skill setup script's "done" state — the
  // manifest only names the script. Reporting installed:true without a real
  // signal would be fake data, so these surface as always-false with the
  // script command as the install/action hint.
  for (const script of manifest.skillSetupScripts ?? []) {
    checks.push({
      id: `setup-script:${script.skill}`,
      kind: "setup-script",
      name: script.skill,
      installed: false,
      detail: script.purpose,
      install: `bash ${script.script}`,
    });
  }

  return { checks, hooksConfigPath: manifest.hooks?.config ?? null };
}

// --- Plugin cache discovery ---

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

type InstalledPlugin = { version: string; root: string; marketplace: string };

async function listLatestPluginVersions(cacheDir: string, marketplace: string): Promise<Map<string, InstalledPlugin>> {
  const result = new Map<string, InstalledPlugin>();
  let pluginNames: string[];
  try {
    pluginNames = (await readdir(cacheDir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return result;
  }

  for (const pluginName of pluginNames) {
    const pluginPath = join(cacheDir, pluginName);
    let versions: string[];
    try {
      versions = (await readdir(pluginPath, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      continue;
    }
    if (versions.length === 0) continue;
    const latest = versions.sort(compareVersions).at(-1) as string;
    result.set(pluginName, { version: latest, root: join(pluginPath, latest), marketplace });
  }

  return result;
}

/** Scan every marketplace cache, not only b-open-io. Pack manifests cite
 * third-party marketplaces, and reporting those as missing while their
 * plugins are installed would make the dependency check untrustworthy. */
export async function listInstalledPlugins(cacheRoot: string): Promise<Map<string, InstalledPlugin>> {
  const result = new Map<string, InstalledPlugin>();
  let marketplaces: string[];
  try {
    marketplaces = (await readdir(cacheRoot, { withFileTypes: true }))
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          !entry.name.startsWith("temp_subdir_") &&
          !entry.name.endsWith(".clone"),
      )
      .map((entry) => entry.name);
  } catch {
    return result;
  }

  for (const marketplace of marketplaces.sort()) {
    const plugins = await listLatestPluginVersions(join(cacheRoot, marketplace), marketplace);
    for (const [name, installed] of plugins) {
      const existing = result.get(name);
      if (!existing || compareVersions(installed.version, existing.version) > 0) {
        result.set(name, installed);
      }
    }
  }
  return result;
}

export async function listPortableSkills(roots: string[] = PORTABLE_SKILL_ROOTS): Promise<string[]> {
  const names = new Set<string>();
  for (const root of roots) {
    try {
      const entries = await readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() || entry.isSymbolicLink()) names.add(entry.name);
      }
    } catch {
      // A harness may not use every portable skill store.
    }
  }
  return [...names].sort();
}

// --- Marketplace catalog ---

export type MarketplaceSnapshot = {
  fetched: boolean;
  error: string | null;
  fetchedAt: string | null;
  versions: Map<string, string>;
  plugins?: Map<string, CatalogPlugin>;
};

function parseMarketplaceBody(body: unknown): {
  versions: Map<string, string>;
  plugins: Map<string, CatalogPlugin>;
} | null {
  const entries: unknown[] | null = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { plugins?: unknown }).plugins)
      ? ((body as { plugins: unknown[] }).plugins)
      : null;
  if (!entries) return null;

  const versions = new Map<string, string>();
  const plugins = new Map<string, CatalogPlugin>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as {
      name?: unknown;
      version?: unknown;
      org?: unknown;
      repo?: unknown;
      install?: unknown;
    };
    if (typeof candidate.name !== "string") continue;
    if (typeof candidate.version === "string") versions.set(candidate.name, candidate.version);
    if (typeof candidate.org !== "string" || typeof candidate.repo !== "string") continue;
    const install =
      typeof candidate.install === "string"
        ? candidate.install.replace(/^\/plugin install /, "claude plugin install ")
        : `claude plugin install ${candidate.name}@${candidate.org}`;
    const marketplace = install.match(/@([a-z0-9][a-z0-9-]*)$/)?.[1] ?? candidate.org;
    plugins.set(candidate.name, {
      name: candidate.name,
      marketplace,
      source: marketplace === "b-open-io" ? "b-open-io/claude-plugins" : `${candidate.org}/${candidate.repo}`,
      install,
      version: typeof candidate.version === "string" ? candidate.version : null,
    });
  }
  return { versions, plugins };
}

export async function fetchMarketplaceCatalog(url: string = DEFAULT_MARKETPLACE_URL): Promise<MarketplaceSnapshot> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MARKETPLACE_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      return { fetched: false, error: `HTTP ${res.status}`, fetchedAt: null, versions: new Map(), plugins: new Map() };
    }

    const parsed = parseMarketplaceBody(await res.json());
    if (!parsed) {
      return { fetched: false, error: "unrecognized marketplace response shape", fetchedAt: null, versions: new Map(), plugins: new Map() };
    }

    return { fetched: true, error: null, fetchedAt: new Date().toISOString(), ...parsed };
  } catch (err) {
    return { fetched: false, error: err instanceof Error ? err.message : String(err), fetchedAt: null, versions: new Map(), plugins: new Map() };
  }
}

// --- Top-level harness detection ---

export async function detectHarness(opts: {
  runtimeArg: Runtime;
  marketplaceUrl?: string;
  marketplaceCache?: MarketplaceSnapshot;
  env?: Record<string, string | undefined>;
  nowSeconds?: number;
  pluginCacheRoots?: { claude: string; codex: string };
  portableSkillRoots?: string[];
  packPath?: string;
}): Promise<HarnessState> {
  const platform = process.platform as HarnessState["platform"];
  const skillActivity = readSkillActivity({ env: opts.env, nowSeconds: opts.nowSeconds });

  const [claudePlugins, codexPlugins, portableSkills, marketplace] = await Promise.all([
    listInstalledPlugins(opts.pluginCacheRoots?.claude ?? CLAUDE_PLUGIN_CACHE),
    listInstalledPlugins(opts.pluginCacheRoots?.codex ?? CODEX_PLUGIN_CACHE),
    listPortableSkills(opts.portableSkillRoots),
    opts.marketplaceCache ?? fetchMarketplaceCatalog(opts.marketplaceUrl),
  ]);

  const pluginNames = new Set<string>([...claudePlugins.keys(), ...codexPlugins.keys(), ...marketplace.versions.keys()]);

  const [plugins, pack] = await Promise.all([
    Promise.all([...pluginNames].sort().map(async (name): Promise<PluginState> => {
      const claude = claudePlugins.get(name);
      const codex = codexPlugins.get(name);
      const root = claude?.root ?? codex?.root;

      let hasSetupManifest = false;
      let checks: CheckState[] = [];
      let hooks: HookState[] = [];
      let hooksConfigPath: string | null = null;

      if (root) {
        const manifestPath = join(root, "setup", "manifest.json");
        if (existsSync(manifestPath)) {
          hasSetupManifest = true;
          const evaluated = await evaluateManifestChecks(manifestPath, platform);
          checks = evaluated.checks;
          hooksConfigPath = evaluated.hooksConfigPath;
        }
        hooks = await loadHookStates(root);
      }

      return {
        name,
        installedClaude: claude?.version ?? null,
        installedCodex: codex?.version ?? null,
        marketplaceVersion: marketplace.versions.get(name) ?? null,
        hasSetupManifest,
        checks,
        hooks,
        hooksConfigPath,
        skillActivity: filterSkillActivityForPlugin(skillActivity, name),
      };
    })),
    opts.packPath ? loadPackState(opts.packPath, { catalog: marketplace.plugins }) : Promise.resolve(null),
  ]);

  return {
    runtimeArg: opts.runtimeArg,
    runtimeDetected: detectRuntime(),
    platform,
    generatedAt: new Date().toISOString(),
    plugins,
    portableSkills,
    pack,
    marketplace: {
      fetched: marketplace.fetched,
      error: marketplace.error,
      fetchedAt: marketplace.fetchedAt,
    },
  };
}
