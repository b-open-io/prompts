import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export type PackRuntime = "claude" | "codex" | "grok";

export type PackPlugin = {
  name: string;
  marketplace: string;
  source: string;
  install: string;
};

export type PackRuntimeState = {
  installed: boolean;
  installedVersion: string | null;
  installCommand: string;
};

export type PackDependency = PackPlugin & {
  runtimes: Record<PackRuntime, PackRuntimeState>;
};

export type PackState = {
  packId: string;
  name: string;
  inputKind: "manifest" | "toc";
  skillIds: string[];
  dependencies: PackDependency[];
};

export type CatalogPlugin = PackPlugin & { version: string | null };

type InstalledPlugin = { version: string; marketplace: string };

type Discovery = {
  claudePlugins: Map<string, InstalledPlugin>;
  codexPlugins: Map<string, InstalledPlugin>;
  claudeMarketplaces: Map<string, string>;
  codexMarketplaces: Map<string, string>;
  portableSources: Map<string, string>;
  portableClaude: Set<string>;
  portableCodex: Set<string>;
  portableGrok: Set<string>;
  grokPlugins: Set<string>;
};

const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;
const GITHUB_SOURCE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
// Older skills installs did not record their source. Keep the exact source from
// bopen-ai's PLUGIN_INSTALLS mapping for those already-installed legacy skills.
const LEGACY_PORTABLE_SOURCES = new Map([["react-doctor", "millionco/react-doctor"]]);

function assertId(value: unknown, label: string): string {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    throw new Error(`pack dependency pass: invalid ${label} ${JSON.stringify(value)}`);
  }
  return value;
}

function normalizeInstall(name: string, marketplace: string, install?: unknown): string {
  if (typeof install === "string" && install.trim()) {
    return install.trim().replace(/^\/plugin install /, "claude plugin install ");
  }
  return `claude plugin install ${name}@${marketplace}`;
}

function githubSource(value: string): string | null {
  const normalized = value
    .trim()
    .replace(/^git\+/, "")
    .replace(/\.git$/, "");
  const match = normalized.match(/github\.com[/:]([^/]+\/[^/]+)$/);
  if (match?.[1]) return match[1];
  return GITHUB_SOURCE.test(normalized) ? normalized : null;
}

function marketplaceSourceForRuntime(plugin: PackPlugin, runtime: PackRuntime): string {
  if (runtime === "codex" && plugin.marketplace === "b-open-io") {
    return "b-open-io/prompts";
  }
  return plugin.source;
}

export function installCommandForRuntime(
  plugin: PackPlugin,
  runtime: PackRuntime,
  marketplaceInstalled: boolean
): string {
  if (plugin.marketplace === "portable-skill") {
    const agent = runtime === "codex" ? "codex" : "claude-code";
    return `npx skills add ${plugin.source} --global --yes --agent ${agent} --skill ${plugin.name}`;
  }

  const lines: string[] = [];
  const source = marketplaceSourceForRuntime(plugin, runtime);
  if (!marketplaceInstalled) {
    const cli = runtime === "codex" ? "codex" : "claude";
    lines.push(`${cli} plugin marketplace add ${source}`);
  }
  if (runtime === "codex") {
    lines.push("codex plugin marketplace upgrade");
    lines.push(`codex plugin add ${plugin.name}@${plugin.marketplace}`);
  } else {
    // Grok Build consumes Claude Code marketplaces and plugin caches directly.
    lines.push(`claude plugin install ${plugin.name}@${plugin.marketplace}`);
  }
  return lines.join("\n");
}

async function latestPluginVersions(cacheRoot: string): Promise<Map<string, InstalledPlugin>> {
  const result = new Map<string, InstalledPlugin>();
  let marketplaces: string[];
  try {
    marketplaces = (await readdir(cacheRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return result;
  }

  for (const marketplace of marketplaces) {
    let plugins: string[];
    try {
      plugins = (await readdir(join(cacheRoot, marketplace), { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      continue;
    }
    for (const name of plugins) {
      let versions: string[];
      try {
        versions = (await readdir(join(cacheRoot, marketplace, name), { withFileTypes: true }))
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      } catch {
        continue;
      }
      const version = versions.at(-1);
      if (version) result.set(name, { version, marketplace });
    }
  }
  return result;
}

async function portableSkillNames(roots: string[]): Promise<Set<string>> {
  const names = new Set<string>();
  for (const root of roots) {
    try {
      for (const entry of await readdir(root, { withFileTypes: true })) {
        if (entry.isDirectory() || entry.isSymbolicLink()) names.add(entry.name);
      }
    } catch {
      // Harness-specific stores are optional.
    }
  }
  return names;
}

async function portableSources(home: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const lockPaths = [
    join(home, ".agents", ".skill-lock.json"),
    join(home, ".codex", "skills-lock.json"),
    join(home, ".claude", "skills-lock.json")
  ];
  try {
    const marketplaceRoot = join(home, ".codex", ".tmp", "marketplaces");
    for (const entry of await readdir(marketplaceRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) lockPaths.push(join(marketplaceRoot, entry.name, "skills-lock.json"));
    }
  } catch {
    // Codex marketplace metadata is optional.
  }

  for (const lockPath of lockPaths) {
    try {
      const parsed = JSON.parse(await readFile(lockPath, "utf8")) as {
        skills?: Record<string, { source?: unknown }>;
      };
      for (const [name, entry] of Object.entries(parsed.skills ?? {})) {
        const source = typeof entry.source === "string" ? githubSource(entry.source) : null;
        if (source) result.set(name, source);
      }
    } catch {
      // Each package-manager lock is optional.
    }
  }
  return result;
}

async function knownClaudeMarketplaceSources(home: string): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  try {
    const parsed = JSON.parse(
      await readFile(join(home, ".claude", "plugins", "known_marketplaces.json"), "utf8")
    ) as Record<string, { source?: { repo?: unknown; url?: unknown } }>;
    for (const [marketplace, entry] of Object.entries(parsed)) {
      const raw =
        typeof entry.source?.repo === "string"
          ? entry.source.repo
          : typeof entry.source?.url === "string"
            ? entry.source.url
            : "";
      const source = githubSource(raw);
      if (SAFE_ID.test(marketplace) && source) result.set(marketplace, source);
    }
  } catch {
    // Claude's known marketplace registry is optional.
  }
  return result;
}

async function marketplaceMappings(
  root: string,
  knownSources?: Map<string, string>
): Promise<{
  sources: Map<string, string>;
  plugins: Map<string, PackPlugin>;
}> {
  const sources = new Map<string, string>();
  const plugins = new Map<string, PackPlugin>();
  let names: string[];
  try {
    names = (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return { sources, plugins };
  }

  for (const directoryName of names) {
    const directory = join(root, directoryName);
    let manifest: { name?: unknown; plugins?: Array<{ name?: unknown }> };
    try {
      manifest = JSON.parse(await readFile(join(directory, ".claude-plugin", "marketplace.json"), "utf8"));
    } catch {
      continue;
    }
    const marketplace =
      typeof manifest.name === "string" && SAFE_ID.test(manifest.name) ? manifest.name : directoryName;
    let source: string | null = knownSources?.get(marketplace) ?? null;
    try {
      const config = await readFile(join(directory, ".git", "config"), "utf8");
      source = githubSource(config.match(/\n\s*url\s*=\s*([^\n]+)/)?.[1] ?? "") ?? source;
    } catch {
      // Local marketplaces may not have Git metadata.
    }
    if (source) sources.set(marketplace, source);
    for (const entry of manifest.plugins ?? []) {
      if (typeof entry.name !== "string" || !SAFE_ID.test(entry.name) || !source) continue;
      plugins.set(entry.name, {
        name: entry.name,
        marketplace,
        source,
        install: `claude plugin install ${entry.name}@${marketplace}`
      });
    }
  }
  return { sources, plugins };
}

function grokEnabledPlugins(config: string): Set<string> {
  const match = config.match(/\[plugins\][\s\S]*?enabled\s*=\s*\[([^\]]*)\]/);
  if (!match?.[1]) return new Set();
  return new Set([...match[1].matchAll(/"([a-z0-9][a-z0-9-]*)"/g)].map((entry) => entry[1] as string));
}

async function discover(home: string): Promise<Discovery & { mappings: Map<string, PackPlugin> }> {
  const claudeMarketplaceRoot = join(home, ".claude", "plugins", "marketplaces");
  const codexMarketplaceRoot = join(home, ".codex", ".tmp", "marketplaces");
  const knownClaudeSources = await knownClaudeMarketplaceSources(home);
  const [claudePlugins, codexPlugins, claudeMarketplaces, codexMarketplaces, lockSources] = await Promise.all([
    latestPluginVersions(join(home, ".claude", "plugins", "cache")),
    latestPluginVersions(join(home, ".codex", "plugins", "cache")),
    marketplaceMappings(claudeMarketplaceRoot, knownClaudeSources),
    marketplaceMappings(codexMarketplaceRoot),
    portableSources(home)
  ]);
  const sharedPortable = [join(home, ".agents", "skills")];
  const [portableClaude, portableCodex, portableGrok] = await Promise.all([
    portableSkillNames([...sharedPortable, join(home, ".claude", "skills")]),
    portableSkillNames([...sharedPortable, join(home, ".codex", "skills")]),
    portableSkillNames([...sharedPortable, join(home, ".claude", "skills"), join(home, ".grok", "skills")])
  ]);
  let grokPlugins = new Set<string>();
  try {
    grokPlugins = grokEnabledPlugins(await readFile(join(home, ".grok", "config.toml"), "utf8"));
  } catch {
    // Grok is optional.
  }
  return {
    claudePlugins,
    codexPlugins,
    claudeMarketplaces: claudeMarketplaces.sources,
    codexMarketplaces: codexMarketplaces.sources,
    portableSources: lockSources,
    portableClaude,
    portableCodex,
    portableGrok,
    grokPlugins,
    mappings: new Map([...claudeMarketplaces.plugins, ...codexMarketplaces.plugins])
  };
}

function packPlugin(raw: unknown): PackPlugin | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const name = assertId(entry.name, "plugin name");
  const marketplace = assertId(entry.marketplace, `marketplace for ${name}`);
  const source = typeof entry.source === "string" ? githubSource(entry.source) : null;
  return source ? { name, marketplace, source, install: normalizeInstall(name, marketplace, entry.install) } : null;
}

function tocSkillIds(raw: Record<string, unknown>): string[] | null {
  if (!Array.isArray(raw.playbooks)) return null;
  const ids: string[] = [];
  for (const playbook of raw.playbooks) {
    if (!playbook || typeof playbook !== "object" || !Array.isArray((playbook as { skills?: unknown }).skills)) {
      throw new Error("pack dependency pass: every ToC playbook must have a skills array");
    }
    for (const skill of (playbook as { skills: unknown[] }).skills) {
      if (typeof skill !== "string" || !skill.trim()) {
        throw new Error("pack dependency pass: skill ids must be non-empty strings");
      }
      if (!ids.includes(skill)) ids.push(skill);
    }
  }
  return ids;
}

function runtimeState(plugin: PackPlugin, runtime: PackRuntime, discovery: Discovery): PackRuntimeState {
  if (plugin.marketplace === "portable-skill") {
    const installed =
      runtime === "claude"
        ? discovery.portableClaude.has(plugin.name)
        : runtime === "codex"
          ? discovery.portableCodex.has(plugin.name)
          : discovery.portableGrok.has(plugin.name);
    return {
      installed,
      installedVersion: installed ? "installed" : null,
      installCommand: installCommandForRuntime(plugin, runtime, true)
    };
  }

  const found =
    runtime === "codex" ? discovery.codexPlugins.get(plugin.name) : discovery.claudePlugins.get(plugin.name);
  const installed =
    found?.marketplace === plugin.marketplace || (runtime === "grok" && discovery.grokPlugins.has(plugin.name));
  const marketplaces = runtime === "codex" ? discovery.codexMarketplaces : discovery.claudeMarketplaces;
  return {
    installed,
    installedVersion: found?.version ?? (installed ? "installed" : null),
    installCommand: installCommandForRuntime(plugin, runtime, marketplaces.has(plugin.marketplace))
  };
}

export async function loadPackState(
  inputPath: string,
  options?: { home?: string; catalog?: Map<string, CatalogPlugin> }
): Promise<PackState> {
  const home = options?.home ?? homedir();
  const raw = JSON.parse(await readFile(inputPath, "utf8")) as Record<string, unknown>;
  const discovery = await discover(home);
  const catalog = options?.catalog ?? new Map<string, CatalogPlugin>();
  const manifestPlugins = Array.isArray(raw.plugins) ? raw.plugins : null;
  const skillIds = manifestPlugins ? [] : (tocSkillIds(raw) ?? []);
  const inputKind = manifestPlugins ? "manifest" : "toc";
  let plugins: PackPlugin[];

  if (manifestPlugins) {
    plugins = manifestPlugins.map((entry) => {
      const parsed = packPlugin(entry);
      if (parsed) return parsed;
      const name = assertId((entry as Record<string, unknown>).name, "plugin name");
      const fallback = catalog.get(name) ?? discovery.mappings.get(name);
      if (!fallback) {
        throw new Error(`pack dependency pass: manifest plugin "${name}" has no source`);
      }
      const entryRecord = entry as Record<string, unknown>;
      const marketplace = assertId(entryRecord.marketplace, `marketplace for ${name}`);
      return {
        name,
        marketplace,
        source: fallback.source,
        install: normalizeInstall(name, marketplace, entryRecord.install)
      };
    });
  } else {
    if (skillIds.length === 0) {
      throw new Error("pack dependency pass: input is neither pack.json nor a ToC with skills");
    }
    const names = [...new Set(skillIds.map((skill) => skill.split(":", 1)[0] as string))];
    const unresolved: string[] = [];
    plugins = names.flatMap((name) => {
      const mapped = catalog.get(name) ?? discovery.mappings.get(name);
      if (mapped) return [mapped];
      const installed = discovery.claudePlugins.get(name) ?? discovery.codexPlugins.get(name);
      if (installed) {
        const source =
          discovery.claudeMarketplaces.get(installed.marketplace) ??
          discovery.codexMarketplaces.get(installed.marketplace);
        if (source) {
          return [
            {
              name,
              marketplace: installed.marketplace,
              source,
              install: `claude plugin install ${name}@${installed.marketplace}`
            }
          ];
        }
      }
      const portableSource = discovery.portableSources.get(name);
      const legacyPortableSource =
        discovery.portableClaude.has(name) || discovery.portableCodex.has(name) || discovery.portableGrok.has(name)
          ? LEGACY_PORTABLE_SOURCES.get(name)
          : undefined;
      if (portableSource || legacyPortableSource) {
        const source = portableSource ?? (legacyPortableSource as string);
        return [
          {
            name,
            marketplace: "portable-skill",
            source,
            install: `npx skills add ${source} --skill ${name}`
          }
        ];
      }
      unresolved.push(name);
      return [];
    });
    if (unresolved.length) {
      throw new Error(
        `pack dependency pass: unresolved plugin prefixes ${unresolved.join(", ")}; use the shipped pack.json manifest`
      );
    }
  }

  const dependencies = plugins.map((plugin) => ({
    ...plugin,
    runtimes: {
      claude: runtimeState(plugin, "claude", discovery),
      codex: runtimeState(plugin, "codex", discovery),
      grok: runtimeState(plugin, "grok", discovery)
    }
  }));

  const packId = assertId(raw.packId ?? raw.slug ?? basename(inputPath, ".json"), "pack id");
  return {
    packId,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : packId,
    inputKind,
    skillIds,
    dependencies
  };
}

export function validatePackRuntime(value: unknown): value is PackRuntime {
  return value === "claude" || value === "codex" || value === "grok";
}

export function packInputExists(path: string | undefined): path is string {
  return typeof path === "string" && path.length > 0 && existsSync(path);
}
