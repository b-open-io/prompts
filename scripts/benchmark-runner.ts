import {
  existsSync,
  mkdtempSync,
  lstatSync,
  readFileSync,
  realpathSync,
  readdirSync,
  statSync,
} from "node:fs";
import type { Dirent } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

export type BenchmarkVariant = "with-skill" | "baseline";

export interface BenchmarkAssertion {
  id: string;
  text: string;
  type: string;
}

export interface BenchmarkEvalCase {
  id: number;
  prompt: string;
  expected_output: string;
  files: string[];
  assertions: BenchmarkAssertion[];
}

export interface BenchmarkEvalFile {
  skill_name: string;
  evals: BenchmarkEvalCase[];
}

export interface DiscoveredSkill {
  /** The directory name used by existing --skill invocations. */
  name: string;
  /** The plugin-qualified identity used for filters, jobs, and cache keys. */
  qualifiedName: string;
  /** Stable alias for integrations that use id terminology. */
  id: string;
  plugin: string;
  evalsPath: string;
  skillPath: string;
  sourceRoot: string;
}

export interface ClaudeInvocation {
  args: string[];
  cwd: string;
  env: Record<string, string | undefined>;
}

export interface ClaudeProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type ClaudeProcessRunner = (
  invocation: ClaudeInvocation,
) => ClaudeProcessResult | Promise<ClaudeProcessResult>;

export interface RunClaudeOptions {
  model: string;
  skillPath?: string;
  skillContent?: string;
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
  processRunner?: ClaudeProcessRunner;
}

export interface ClaudeRunResult {
  output: string;
  tokens: number | null;
  duration_ms: number;
}

export class BenchmarkInfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BenchmarkInfrastructureError";
  }
}

export class ClaudeRunError extends Error {
  readonly raw?: string;
  readonly timedOut: boolean;

  constructor(message: string, options?: { raw?: string; timedOut?: boolean }) {
    super(message);
    this.name = "ClaudeRunError";
    this.raw = options?.raw;
    this.timedOut = options?.timedOut ?? false;
  }
}

const REQUIRED_CLAUDE_FLAGS = [
  "--bare",
  "--append-system-prompt",
  "--disable-slash-commands",
  "--strict-mcp-config",
  "--mcp-config",
  "--tools",
  "--output-format",
  "--json-schema",
  "--no-session-persistence",
] as const;

export const EMPTY_MCP_CONFIG = JSON.stringify({ mcpServers: {} });
export const BENCHMARK_WORKING_DIRECTORY_PREFIX = "benchmark-text-ablation-";
export const DEFAULT_CLAUDE_TIMEOUT_MS = 120_000;

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isWithin(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${"/"}`) && !isAbsolute(rel));
}

function safeDirectory(path: string, repositoryRoot: string): boolean {
  try {
    const entry = lstatSync(path);
    if (!entry.isDirectory() && !entry.isSymbolicLink()) return false;
    const resolvedRoot = realpathSync(repositoryRoot);
    const resolvedPath = realpathSync(path);
    return isWithin(resolvedRoot, resolvedPath) && isDirectory(resolvedPath);
  } catch {
    return false;
  }
}

function manifestPluginName(root: string): string | undefined {
  for (const manifest of [
    join(root, ".claude-plugin", "plugin.json"),
    join(root, ".codex-plugin", "plugin.json"),
  ]) {
    if (!existsSync(manifest)) continue;
    try {
      const parsed = JSON.parse(readFileSync(manifest, "utf8")) as { name?: unknown };
      if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
    } catch {
      // A malformed manifest must not make otherwise discoverable skills disappear.
    }
  }
  return undefined;
}

function pluginNameForRoot(root: string, fallback: string): string {
  return manifestPluginName(root) ?? fallback;
}

function skillCandidates(root: string, plugin: string, repositoryRoot: string): DiscoveredSkill[] {
  const skillsDir = join(root, "skills");
  if (!safeDirectory(skillsDir, repositoryRoot)) return [];

  let entries: Dirent[] = [];
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const result: DiscoveredSkill[] = [];
  for (const entry of entries) {
    const skillPath = join(skillsDir, entry.name);
    if (!safeDirectory(skillPath, repositoryRoot)) continue;
    const evalsPath = join(skillPath, "evals", "evals.json");
    if (!existsSync(evalsPath)) continue;
    result.push({
      name: entry.name,
      qualifiedName: `${plugin}:${entry.name}`,
      id: `${plugin}:${entry.name}`,
      plugin,
      evalsPath,
      skillPath,
      sourceRoot: root,
    });
  }
  return result;
}

function moduleRoots(repositoryRoot: string): string[] {
  const modulesDir = join(repositoryRoot, "modules");
  if (!safeDirectory(modulesDir, repositoryRoot)) return [];
  try {
    return readdirSync(modulesDir, { withFileTypes: true })
      .map(entry => join(modulesDir, entry.name))
      .filter(path => safeDirectory(path, repositoryRoot));
  } catch {
    return [];
  }
}

/**
 * Discover root-plugin and module-plugin skills that have eval contracts.
 * Symlinked (vendored) skills are accepted only when their resolved target is
 * still below repositoryRoot, preventing an accidental external tree scan.
 */
export function discoverSkills(repositoryRoot: string, filter?: string): DiscoveredSkill[] {
  const root = resolve(repositoryRoot);
  const discovered: DiscoveredSkill[] = [];
  const rootPlugin = pluginNameForRoot(root, "root");
  discovered.push(...skillCandidates(root, rootPlugin, root));

  for (const moduleRoot of moduleRoots(root)) {
    const fallbackPlugin = basename(moduleRoot);
    const plugin = pluginNameForRoot(moduleRoot, fallbackPlugin);
    discovered.push(...skillCandidates(moduleRoot, plugin, root));
  }

  discovered.sort((a, b) => a.qualifiedName.localeCompare(b.qualifiedName));
  if (!filter) return discovered;

  if (filter.includes(":")) {
    return discovered.filter(skill => skill.qualifiedName === filter);
  }

  const matching = discovered.filter(skill => skill.name === filter);
  if (matching.length > 1) {
    throw new BenchmarkInfrastructureError(
      `Ambiguous skill filter "${filter}". Use one of: ${matching.map(skill => skill.qualifiedName).join(", ")}`,
    );
  }
  return matching;
}

/** Alias kept explicit for callers that want to communicate that filtering is qualified. */
export const discoverBenchmarkSkills = discoverSkills;

export function createBenchmarkWorkingDirectory(): string {
  return mkdtempSync(join(tmpdir(), BENCHMARK_WORKING_DIRECTORY_PREFIX));
}

export function buildClaudeEnvironment(
  source: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  const env = { ...source };
  // Prevent nested-session behavior while preserving provider credentials in memory.
  delete env.CLAUDECODE;
  return env;
}

export interface ClaudeArgsOptions {
  model: string;
  skillContent?: string;
  jsonSchema?: unknown;
}

/** Build the complete, tool-free, bare Claude command used by both arms. */
export function buildClaudeArgs(prompt: string, options: ClaudeArgsOptions): string[] {
  const args = [
    "claude",
    "-p",
    prompt,
    "--model",
    options.model,
    "--output-format",
    "json",
    "--bare",
    "--no-session-persistence",
    "--disable-slash-commands",
    "--strict-mcp-config",
    "--mcp-config",
    EMPTY_MCP_CONFIG,
    "--tools",
    "",
  ];

  if (options.jsonSchema !== undefined) {
    args.push("--json-schema", JSON.stringify(options.jsonSchema));
  }
  if (options.skillContent !== undefined) {
    args.push("--append-system-prompt", options.skillContent);
  }
  return args;
}

export function buildClaudeInvocation(
  prompt: string,
  options: RunClaudeOptions & { jsonSchema?: unknown },
): ClaudeInvocation {
  let skillContent = options.skillContent;
  if (skillContent === undefined && options.skillPath) {
    const skillMdPath = join(options.skillPath, "SKILL.md");
    if (!existsSync(skillMdPath)) {
      throw new BenchmarkInfrastructureError(`Skill at ${options.skillPath} is missing SKILL.md`);
    }
    skillContent = readFileSync(skillMdPath, "utf8");
  }
  return {
    args: buildClaudeArgs(prompt, {
      model: options.model,
      skillContent,
      jsonSchema: options.jsonSchema,
    }),
    cwd: options.cwd ?? process.cwd(),
    env: buildClaudeEnvironment(options.env),
  };
}

/** Alias for tests and integrations that call command construction a launch. */
export const buildClaudeLaunch = buildClaudeInvocation;

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function normalizeTokenCount(value: unknown): number | null {
  return finiteNonNegative(value) ?? null;
}

/**
 * Account for complete provider usage only. Missing or corrupt telemetry is
 * unknown (null), rather than measured as a zero-token run.
 */
export function usageTokens(usage: unknown): number | null {
  if (!isRecord(usage)) return null;
  const has = (key: string): boolean => Object.prototype.hasOwnProperty.call(usage, key);
  const total = finiteNonNegative(usage.total_tokens);
  if (total !== undefined) return total;

  const input = finiteNonNegative(usage.input_tokens);
  const output = finiteNonNegative(usage.output_tokens);
  if (input === undefined || output === undefined) return null;

  let cacheTokens = 0;
  for (const key of ["cache_read_input_tokens", "cache_creation_input_tokens"]) {
    if (!has(key)) continue;
    const cache = finiteNonNegative(usage[key]);
    if (cache === undefined) return null;
    cacheTokens += cache;
  }
  const totalTokens = input + output + cacheTokens;
  return Number.isFinite(totalTokens) ? totalTokens : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Validate the contract before planning text-only jobs. */
export function validateTextAblationEvalFile(
  value: unknown,
  source = "evals/evals.json",
): BenchmarkEvalFile {
  if (!isRecord(value) || typeof value.skill_name !== "string" || !value.skill_name.trim()) {
    throw new BenchmarkInfrastructureError(`${source} must contain a non-empty skill_name`);
  }
  if (!Array.isArray(value.evals) || value.evals.length === 0) {
    throw new BenchmarkInfrastructureError(`${source} contains no eval cases; refusing to run a green empty benchmark`);
  }

  const seenIds = new Set<number>();
  const evals = value.evals.map((rawEval, index): BenchmarkEvalCase => {
    if (!isRecord(rawEval)) {
      throw new BenchmarkInfrastructureError(`${source} eval #${index + 1} must be an object`);
    }
    if (typeof rawEval.id !== "number" || !Number.isInteger(rawEval.id)) {
      throw new BenchmarkInfrastructureError(`${source} eval #${index + 1} must have an integer id`);
    }
    if (seenIds.has(rawEval.id)) {
      throw new BenchmarkInfrastructureError(`${source} contains duplicate eval id ${rawEval.id}`);
    }
    seenIds.add(rawEval.id);
    if (typeof rawEval.prompt !== "string" || !rawEval.prompt.trim()) {
      throw new BenchmarkInfrastructureError(`${source} eval ${rawEval.id} must have a non-empty prompt`);
    }
    if (typeof rawEval.expected_output !== "string") {
      throw new BenchmarkInfrastructureError(`${source} eval ${rawEval.id} must have expected_output text`);
    }
    if (!Array.isArray(rawEval.files)) {
      throw new BenchmarkInfrastructureError(`${source} eval ${rawEval.id} must declare files[]`);
    }
    if (rawEval.files.length > 0) {
      throw new BenchmarkInfrastructureError(
        `${source} eval ${rawEval.id} declares files; text-body ablation is text-only and cannot silently grade file-dependent cases`,
      );
    }
    if (!Array.isArray(rawEval.assertions) || rawEval.assertions.length === 0) {
      throw new BenchmarkInfrastructureError(`${source} eval ${rawEval.id} must declare non-empty assertions[]`);
    }
    const assertionIds = new Set<string>();
    const assertions = rawEval.assertions.map((rawAssertion, assertionIndex): BenchmarkAssertion => {
      if (!isRecord(rawAssertion)
        || typeof rawAssertion.id !== "string"
        || !rawAssertion.id.trim()
        || typeof rawAssertion.text !== "string"
        || !rawAssertion.text.trim()
        || typeof rawAssertion.type !== "string"
        || !rawAssertion.type.trim()) {
        throw new BenchmarkInfrastructureError(
          `${source} eval ${rawEval.id} assertion #${assertionIndex + 1} must contain id, text, and type`,
        );
      }
      if (assertionIds.has(rawAssertion.id)) throw new BenchmarkInfrastructureError(`${source} eval ${rawEval.id} contains duplicate assertion id ${rawAssertion.id}`);
      assertionIds.add(rawAssertion.id);
      return {
        id: rawAssertion.id,
        text: rawAssertion.text,
        type: rawAssertion.type,
      };
    });
    return {
      id: rawEval.id,
      prompt: rawEval.prompt,
      expected_output: rawEval.expected_output,
      files: [],
      assertions,
    };
  });

  return { skill_name: value.skill_name, evals };
}

export function validateConcurrency(value: unknown): number {
  const concurrency = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim().length > 0
      ? Number(value)
      : Number.NaN;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new BenchmarkInfrastructureError(`Concurrency must be a positive integer; received ${String(value)}`);
  }
  return concurrency;
}

function outputText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return undefined;
  const text = value
    .filter(part => isRecord(part) && part.type === "text" && typeof part.text === "string")
    .map(part => part.text as string)
    .join("");
  return text || undefined;
}

/** Parse only known Claude JSON envelopes; raw stdout is never a successful output. */
export function parseClaudeOutput(
  stdout: string,
  stderr = "",
  exitCode = 0,
  duration_ms = 0,
): ClaudeRunResult {
  if (exitCode !== 0) {
    throw new ClaudeRunError(
      `claude exited ${exitCode}: ${stderr.slice(0, 400)}`,
      { raw: stderr || stdout },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new ClaudeRunError(
      `claude returned malformed JSON: ${error instanceof Error ? error.message : String(error)}`,
      { raw: stdout },
    );
  }
  if (!isRecord(parsed)) {
    throw new ClaudeRunError("claude returned a JSON value without a result envelope", { raw: stdout });
  }
  if (parsed.is_error) {
    const detail = outputText(parsed.result) ?? (typeof parsed.error === "string" ? parsed.error : "API error");
    throw new ClaudeRunError(`claude returned an error response: ${detail}`, { raw: stdout });
  }

  const output = outputText(parsed.result) ?? outputText(parsed.content) ?? outputText(parsed.text);
  if (output === undefined) {
    throw new ClaudeRunError("claude JSON response did not contain a result", { raw: stdout });
  }
  return {
    output,
    tokens: usageTokens(parsed.usage),
    duration_ms,
  };
}

export async function runClaude(
  prompt: string,
  options: RunClaudeOptions,
): Promise<ClaudeRunResult> {
  const invocation = buildClaudeInvocation(prompt, options);
  const start = performance.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_CLAUDE_TIMEOUT_MS;
  const usingDefaultRunner = options.processRunner === undefined;
  const runner = options.processRunner ?? ((value: ClaudeInvocation) => runClaudeProcess(value, timeoutMs));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const result = await new Promise<ClaudeProcessResult>((resolveResult, reject) => {
    if (!usingDefaultRunner && timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new ClaudeRunError(`claude timed out after ${timeoutMs}ms`, { timedOut: true }));
      }, timeoutMs);
    }
    Promise.resolve(runner(invocation)).then(resolveResult, reject);
  }).finally(() => {
    if (timer) clearTimeout(timer);
  });

  if (timedOut) {
    throw new ClaudeRunError(`claude timed out after ${timeoutMs}ms`, { timedOut: true });
  }
  return parseClaudeOutput(
    result.stdout,
    result.stderr,
    result.exitCode,
    Math.round(performance.now() - start),
  );
}

async function runClaudeProcess(invocation: ClaudeInvocation, timeoutMs: number): Promise<ClaudeProcessResult> {
  const proc = Bun.spawn(invocation.args, {
    cwd: invocation.cwd,
    env: invocation.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const processResult = Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]).then(([stdout, stderr, exitCode]) => ({ stdout, stderr, exitCode }));
  if (timeoutMs <= 0) return processResult;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      processResult,
      new Promise<ClaudeProcessResult>((_, reject) => {
        timer = setTimeout(() => {
          proc.kill();
          reject(new ClaudeRunError(`claude timed out after ${timeoutMs}ms`, { timedOut: true }));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasClaudeAuth(env: Record<string, string | undefined> = process.env): boolean {
  if (hasText(env.ANTHROPIC_API_KEY)) return true;
  if (hasText(env.FOUNDRY_API_KEY) || hasText(env.AZURE_API_KEY)) return true;
  if (hasText(env.GOOGLE_APPLICATION_CREDENTIALS)) return true;
  return hasText(env.AWS_ACCESS_KEY_ID) && hasText(env.AWS_SECRET_ACCESS_KEY);
}

export function validateClaudeHelp(helpText: string): void {
  const missing = REQUIRED_CLAUDE_FLAGS.filter(flag => !helpText.includes(flag));
  if (missing.length > 0) {
    throw new BenchmarkInfrastructureError(
      `Claude CLI is missing required benchmark flag${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. Upgrade Claude Code; benchmark arms cannot be run safely with this CLI.`,
    );
  }
}

export interface ClaudePreflightOptions {
  command?: string;
  env?: Record<string, string | undefined>;
  run?: (args: string[]) => ClaudeProcessResult | Promise<ClaudeProcessResult>;
}

/** Validate CLI capabilities and bare-mode auth without making an API/model call. */
export async function preflightClaude(options: ClaudePreflightOptions = {}): Promise<void> {
  const command = options.command ?? "claude";
  const env = options.env ?? process.env;
  if (!hasClaudeAuth(env)) {
    throw new BenchmarkInfrastructureError(
      "Claude benchmark requires bare-mode provider authentication. Set ANTHROPIC_API_KEY (or the documented Bedrock, Vertex, or Foundry credentials) before running; no user secrets are copied or changed.",
    );
  }

  const run = options.run ?? (async (args: string[]) => {
    const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", env: buildClaudeEnvironment(env) });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { stdout, stderr, exitCode };
  });

  const which = await run(["which", command]);
  if (which.exitCode !== 0) {
    throw new BenchmarkInfrastructureError("Claude CLI not found in PATH. Install Claude Code before running the benchmark.");
  }
  const help = await run([command, "--help"]);
  if (help.exitCode !== 0) {
    throw new BenchmarkInfrastructureError(
      `Claude CLI preflight failed (exit ${help.exitCode}): ${help.stderr.slice(0, 400)}`,
    );
  }
  validateClaudeHelp(help.stdout);
}
