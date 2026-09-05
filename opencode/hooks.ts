import { existsSync, realpathSync } from "node:fs";
import { mkdtemp, writeFile, rm, realpath, mkdir, symlink, readFile } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { tmpdir, homedir } from "node:os";

type RecordValue = Record<string, any>;
export type HookRunner = (root: string, script: string, input: RecordValue) => Promise<RecordValue>;
type Context = { client: any; directory: string; worktree: string };
const nativeGuidance = "OpenCode: load installed skills with the native skill tool; delegate with task and its subagent_type. Use the installed OpenCode agent/skill names, not Claude tool names. Never infer that a Claude-only tool is available.";

/** Execute only the adapter's hardcoded trusted script names, never manifest commands. */
function runner(directory: string, environment: () => Promise<Record<string, string>>): HookRunner {
  return async (root, script, input) => {
    for (const executable of ["bash", "jq", "python3"]) {
      if (!Bun.which(executable)) throw new Error(`bOpen hooks require ${executable}; install it before retrying.`);
    }
    const child = Bun.spawn([script.endsWith(".py") ? "python3" : "bash", join(root, "hooks", script)], {
      cwd: directory,
      env: { ...process.env, ...await environment(), BOPEN_HOOK_RUNTIME: "claude", CLAUDE_PLUGIN_ROOT: root,
        CLAUDE_PROJECT_DIR: directory, CLAUDE_WORKING_DIR: directory },
      stdin: new Blob([JSON.stringify(input)]), stdout: "pipe", stderr: "pipe",
    });
    const timeout = setTimeout(() => child.kill(), 30_000);
    try {
      const [stdout, , code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      if (code !== 0) throw new Error(`bOpen ${script} failed; tool was not approved.`);
      if (!stdout.trim()) return {};
      const result = JSON.parse(stdout);
      if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error(`Invalid ${script} output`);
      return result;
    } finally { clearTimeout(timeout); }
  };
}

async function canonicalPath(path: string, directory: string): Promise<string> {
  const absolute = resolve(directory, path);
  try { return await realpath(absolute); } catch {
    if (dirname(absolute) === absolute) return absolute;
    return join(await canonicalPath(dirname(absolute), directory), basename(absolute));
  }
}

/** Strict patch-header adaptation includes move destinations and normalized symlink paths. */
export async function normalizeTool(tool: string, args: RecordValue, directory: string) {
  const names: Record<string, string> = { bash: "Bash", read: "Read", write: "Write", edit: "Edit", task: "Task", skill: "Skill", webfetch: "WebFetch" };
  const input = { ...args };
  if (["read", "write", "edit"].includes(tool)) {
    if (typeof args.filePath !== "string" || !args.filePath) throw new Error("Missing file path; guard cannot validate this tool.");
    input.file_path = await canonicalPath(args.filePath, directory);
  }
  if (tool === "skill") input.skill = args.name;
  if (tool === "apply_patch") {
    if (typeof args.patchText !== "string") throw new Error("Missing patchText; guard cannot validate patch paths.");
    const headers = args.patchText.split("\n").filter((line: string) => /^\*\*\* (?:Add File:|Update File:|Delete File:|Move to:)/.test(line));
    if (!headers.length) throw new Error("Patch has no recognized file operations.");
    const normalized = [];
    let source: string | undefined;
    for (const header of headers) {
      const match = /^\*\*\* (Add File|Update File|Delete File|Move to): (.+)$/.exec(header.trimEnd());
      if (!match) throw new Error("Malformed patch path.");
      if (match[1] === "Update File") source = match[2];
      if (match[1] === "Move to") {
        if (!source) throw new Error("Patch move has no source path.");
        normalized.push(`*** Delete File: ${await canonicalPath(source, directory)}`);
      }
      normalized.push(`*** ${match[1] === "Move to" ? "Add File" : match[1]}: ${await canonicalPath(match[2], directory)}`);
    }
    input.input = normalized.join("\n");
  }
  return { tool_name: names[tool] ?? tool, tool_input: input };
}

type State = { epoch: number; retries: number; blocked: boolean; busy: boolean; seen: Set<string>; context: string; contextLoaded: boolean; contextLoading?: Promise<void>; guidance: string };
export function createHooks({ client, directory }: Context, roots: string[], options: { run?: HookRunner; maxContinuations?: number; coreRoot?: string } = {}) {
  let runtimeHome: string | undefined;
  let runtimeEnvironment: Promise<Record<string, string>> | undefined;
  const pluginNames = new Map<string, string>();
  const environment = () => runtimeEnvironment ??= (async () => {
    runtimeHome = await mkdtemp(join(tmpdir(), "bopen-opencode-hooks-"));
    const cache = join(runtimeHome, "cache");
    const index = join(runtimeHome, "router-index.json");
    await mkdir(cache);
    for (const root of roots) {
      try {
        const manifest = JSON.parse(await readFile(join(root, ".claude-plugin/plugin.json"), "utf8"));
        if (!/^[a-z0-9][a-z0-9-]*$/.test(manifest.name)) continue;
        pluginNames.set(root, manifest.name);
        const target = join(cache, manifest.name);
        await mkdir(target, { recursive: true });
        await symlink(root, join(target, "installed"));
      } catch { /* No trusted plugin manifest: do not invent a routing identity. */ }
    }
    await writeFile(index, JSON.stringify({ version: 1, entries: [] }), { mode: 0o600 });
    const builderRoot = roots.find(root => existsSync(join(root, "scripts/build-router-index.py")));
    if (builderRoot) {
      const child = Bun.spawn(["python3", join(builderRoot, "scripts/build-router-index.py"), "--cache-root", cache, "--output", index], { stdout: "ignore", stderr: "ignore" });
      const timeout = setTimeout(() => child.kill(), 10_000);
      try { await child.exited; } finally { clearTimeout(timeout); }
    }
    const projectConfig = join(directory, ".opencode/bopen-hooks.json");
    const globalConfig = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "opencode/bopen-hooks.json");
    const config = process.env.BOPEN_HOOKS_CONFIG ?? (existsSync(projectConfig) ? projectConfig : globalConfig);
    return { BOPEN_PLUGIN_CACHE_ROOT: cache, BOPEN_ROUTER_INDEX: index,
      BOPEN_ROUTER_STATE_DIR: join(runtimeHome, "router-state"),
      ...(existsSync(config) ? { BOPEN_HOOKS_CONFIG: config } : {}) };
  })();
  const run = options.run ?? runner(directory, environment);
  const cap = Math.max(0, Math.min(options.maxContinuations ?? 5, 20));
  const states = new Map<string, State>();
  const pendingContinuation = new Map<string, string>();
  let disposed = false;
  const state = (id: string) => {
    if (!states.has(id)) states.set(id, { epoch: 0, retries: 0, blocked: false, busy: false, seen: new Set(), context: "", contextLoaded: false, guidance: "" });
    return states.get(id)!;
  };
  const coreRoot = realpathSync(options.run && options.coreRoot ? options.coreRoot : join(import.meta.dir, ".."));
  const hasCore = roots.some(root => realpathSync(root) === coreRoot);
  const selected = (script: string) => {
    if (!hasCore) return [];
    const path = realpathSync(join(coreRoot, "hooks", script));
    if (!path.startsWith(coreRoot + "/hooks/")) throw new Error("Core hook escaped its source directory");
    return [coreRoot];
  };
  const invoke = async (script: string, input: RecordValue, guard = false) => {
    const results: RecordValue[] = [];
    for (const root of selected(script)) {
      try { results.push(await run(root, script, { cwd: directory, ...input })); }
      catch (error) { if (guard) throw error; }
    }
    return results;
  };
  // session-context.sh is the initial session snapshot; routing stays per message.
  const ensureContextSnapshot = async (s: State, data: RecordValue) => {
    if (s.contextLoaded) return;
    if (s.contextLoading) return s.contextLoading;
    let loading: Promise<void>;
    loading = (async () => {
      try {
        s.context = guidance(await invoke("session-context.sh", data, true));
        s.contextLoaded = true;
      } catch {
        s.context = "";
      } finally {
        if (s.contextLoading === loading) s.contextLoading = undefined;
      }
    })();
    s.contextLoading = loading;
    return loading;
  };
  const guidance = (results: RecordValue[]) => results.map(r => r.hookSpecificOutput?.additionalContext).filter(v => typeof v === "string").join("\n")
    .replace(/Skill\((?:[\w-]+:)?([\w-]+)\)/g, 'skill tool with name "$1"')
    .replace(/subagent_type ([\w-]+):([\w-]+)/g, 'subagent_type bopen-$1-$2');
  const enforce = (results: RecordValue[]) => {
    for (const result of results) {
      const decision = result.hookSpecificOutput?.permissionDecision ?? result.decision;
      if (decision && !["allow", "approve"].includes(decision)) {
        throw new Error(result.hookSpecificOutput?.permissionDecisionReason ?? result.reason ?? result.systemMessage ?? "bOpen guard requires explicit user action before this tool can run.");
      }
    }
  };
  const request = (id: string) => ({ path: { id }, query: { directory } });
  const unwrap = (response: any) => { if (response.error) throw new Error("OpenCode request failed"); return response.data; };

  const continueIfNeeded = async (id: string) => {
    const s = state(id);
    if (disposed || s.busy || s.blocked || s.retries >= cap || !selected("hammertime.py").length) return;
    s.busy = true;
    const epoch = s.epoch;
    let temp: string | undefined;
    try {
      const session = unwrap(await client.session.get(request(id)));
      if (!session || session.parentID) return;
      const messages = unwrap(await client.session.messages(request(id)));
      if (!Array.isArray(messages)) return;
      const last = messages.at(-1);
      const user = messages.findLast((m: any) => m.info.role === "user");
      const info = last?.info;
      if (!user || info?.role !== "assistant" || !info.time?.completed || info.finish !== "stop" || info.error || info.parentID !== user.info.id || s.seen.has(info.id)) return;
      if (messages.some((m: any) => m.parts.some((p: any) => p.type === "tool" && ["pending", "running"].includes(p.state?.status)))) return;
      s.seen.add(info.id);
      // The evaluator must never fall back to an unrelated Claude transcript.
      temp = await mkdtemp(join(tmpdir(), "bopen-opencode-stop-"));
      const transcript = join(temp, "transcript.jsonl");
      const rows = messages.slice(messages.indexOf(user)).map((m: any) => ({ type: m.info.role, message: {
        role: m.info.role, content: m.parts.filter((p: any) => p.type === "text").map((p: any) => ({ type: "text", text: p.text })),
      } }));
      await writeFile(transcript, rows.map((r: any) => JSON.stringify(r)).join("\n"), { mode: 0o600 });
      const results = await invoke("hammertime.py", { session_id: id, transcript_path: transcript,
        last_assistant_message: last.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n"), stop_hook_active: s.retries > 0 });
      const block = results.find(r => r.decision === "block");
      if (!block || disposed || s.blocked || s.epoch !== epoch) return;
      const current = unwrap(await client.session.messages(request(id)));
      if (current?.at(-1)?.info.id !== info.id || disposed || s.blocked || s.epoch !== epoch) return;
      const statuses = unwrap(await client.session.status({ query: { directory } }));
      if (statuses?.[id] && statuses[id].type !== "idle") return;
      if (disposed || s.blocked || s.epoch !== epoch) return;
      const text = `[bOpen automatic follow-up ${s.retries + 1}/${cap}]\n${block.systemMessage ?? block.reason}\nRespect the user's original scope and stop requests.`;
      s.retries++;
      pendingContinuation.set(id, text);
      // Never retry ambiguous submission failures: that could duplicate paid work.
      const response = await client.session.promptAsync({ ...request(id), body: { agent: user.info.agent,
        model: user.info.model, parts: [{ type: "text", text }] } });
      if (response.error) s.blocked = true;
    } catch { s.blocked = true; }
    finally { s.busy = false; if (temp) await rm(temp, { recursive: true, force: true }); }
  };

  return {
    async "chat.message"(input: RecordValue, output: RecordValue) {
      if (disposed) return;
      const s = state(input.sessionID);
      const expected = pendingContinuation.get(input.sessionID);
      if (expected && output.parts.some((p: any) => p.type === "text" && p.text === expected)) { pendingContinuation.delete(input.sessionID); return; }
      pendingContinuation.delete(input.sessionID);
      s.epoch++; s.retries = 0; s.blocked = false;
      const prompt = output.parts.filter((p: any) => p.type === "text" && !p.synthetic).map((p: any) => p.text).join("\n");
      const data = { session_id: input.sessionID, prompt };
      await ensureContextSnapshot(s, data);
      if (disposed) return;
      const browser = await invoke("browser-intent.sh", data);
      if (disposed) return;
      const router = await invoke("prompt-router.sh", data);
      if (disposed) return;
      s.guidance = guidance([...browser, ...router]);
    },
    async "experimental.chat.system.transform"(input: RecordValue, output: { system: string[] }) {
      const s = input.sessionID ? state(input.sessionID) : undefined;
      output.system.push([s?.context, s?.guidance, nativeGuidance].filter(Boolean).join("\n"));
    },
    async "tool.execute.before"(input: RecordValue, output: { args: RecordValue }) {
      const tool = input.tool;
      const data = { ...(await normalizeTool(tool, output.args, directory)), session_id: input.sessionID };
      if (tool === "task") {
        if (data.tool_input.subagent_type === "general") data.tool_input.subagent_type = "general-purpose";
        if (data.tool_input.subagent_type === "explore") data.tool_input.subagent_type = "Explore";
        for (const name of pluginNames.values()) {
          const prefix = `bopen-${name}-`;
          if (data.tool_input.subagent_type?.startsWith(prefix)) data.tool_input.subagent_type = `${name}:${data.tool_input.subagent_type.slice(prefix.length)}`;
        }
      }
      if (tool === "bash") enforce(await invoke("pretooluse-bash.sh", data, true));
      if (["read", "write", "edit", "apply_patch"].includes(tool)) enforce(await invoke("damage-control.sh", data, true));
      if (tool === "task") { const results = await invoke("roster-guard.sh", data, true); enforce(results); state(input.sessionID).guidance += "\n" + guidance(results); }
      if (tool === "skill") await invoke("skill-activity.sh", data);
    },
    async "experimental.session.compacting"(input: RecordValue, output: { context: string[] }) {
      output.context.push(nativeGuidance);
    },
    async event({ event }: { event: RecordValue }) {
      const id = event.properties?.sessionID ?? event.properties?.info?.id;
      if (!id) return;
      if (["session.error", "session.deleted"].includes(event.type)) {
        const s = state(id); s.blocked = true; s.epoch++;
      }
      if (event.type === "session.idle") await continueIfNeeded(id);
    },
    async dispose() {
      disposed = true;
      for (const s of states.values()) { s.blocked = true; s.epoch++; }
      await runtimeEnvironment?.catch(() => {});
      if (runtimeHome) await rm(runtimeHome, { recursive: true, force: true });
    },
  };
}
