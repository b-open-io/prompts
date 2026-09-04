import { describe, test, expect } from "bun:test";
import { mkdtemp, writeFile, mkdir, rm, readFile, symlink, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHooks, normalizeTool, type HookRunner } from "./hooks";

async function fixture(run: HookRunner) {
  const root = await mkdtemp(join(tmpdir(), "bopen-hook-test-"));
  await mkdir(join(root, "hooks"));
  for (const script of ["hammertime.py", "damage-control.sh", "pretooluse-bash.sh", "browser-intent.sh", "session-context.sh", "prompt-router.sh", "roster-guard.sh", "skill-activity.sh"]) await writeFile(join(root, "hooks", script), "");
  const messages: any[] = [
    { info: { id: "u1", role: "user", agent: "build", model: { providerID: "test", modelID: "test" } }, parts: [{ type: "text", text: "Fix it" }] },
    { info: { id: "a1", role: "assistant", parentID: "u1", finish: "stop", time: { completed: 1 } }, parts: [{ type: "text", text: "These errors are pre-existing." }] },
  ];
  const calls: any[] = [];
  const client = { session: {
    get: async () => ({ data: { id: "s1" } }), messages: async () => ({ data: messages }),
    status: async () => ({ data: {} }), promptAsync: async (value: any) => { calls.push(value); return {}; },
  } };
  const hooks = createHooks({ client, directory: root, worktree: root }, [root], { run, coreRoot: root });
  const idle = () => hooks.event({ event: { type: "session.idle", properties: { sessionID: "s1" } } });
  return { root, hooks, messages, client, calls, idle, cleanup: () => rm(root, { recursive: true, force: true }) };
}

describe("native guard adapter", () => {
  test("ask and failed guard both prevent tool execution", async () => {
    const f = await fixture(async () => ({ hookSpecificOutput: { permissionDecision: "ask", permissionDecisionReason: "Confirm publish" } }));
    try { await expect(f.hooks["tool.execute.before"]({ tool: "bash", sessionID: "s1" }, { args: { command: "git push" } })).rejects.toThrow("Confirm publish"); }
    finally { await f.cleanup(); }
    const g = await fixture(async () => { throw new Error("runner timed out"); });
    try { await expect(g.hooks["tool.execute.before"]({ tool: "bash", sessionID: "s1" }, { args: { command: "ls" } })).rejects.toThrow("timed out"); }
    finally { await g.cleanup(); }
  });
  test("patch move destinations and symlinks are checked", async () => {
    const f = await fixture(async () => ({}));
    try {
      await mkdir(join(f.root, "actual")); await symlink(join(f.root, "actual"), join(f.root, "alias"));
      const data = await normalizeTool("apply_patch", { patchText: "*** Begin Patch\n*** Update File: alias/file\n*** Move to: alias/.env\n*** End Patch" }, f.root);
      expect(data.tool_input.input).toContain(`*** Add File: ${await realpath(f.root)}/actual/.env`);
      await expect(normalizeTool("apply_patch", { patchText: "unknown" }, f.root)).rejects.toThrow("recognized");
    } finally { await f.cleanup(); }
  });
});

describe("HammerTime lifecycle", () => {
  test("normalizes private transcript, preserves model, deduplicates idle, cleans up", async () => {
    let transcript = "";
    const f = await fixture(async (_root, script, input) => {
      if (script !== "hammertime.py") return {};
      transcript = input.transcript_path;
      expect(await readFile(transcript, "utf8")).toContain('"type":"assistant"');
      return { decision: "block", systemMessage: "Fix the errors" };
    });
    try {
      await f.idle(); await f.idle();
      expect(f.calls.length).toBe(1);
      expect(f.calls[0].body.model.modelID).toBe("test");
      expect(await Bun.file(transcript).exists()).toBe(false);
    } finally { await f.cleanup(); }
  });
  test("does not restart aborted or errored sessions", async () => {
    const f = await fixture(async () => ({ decision: "block", reason: "Continue" }));
    try {
      f.messages[1].info.error = { name: "MessageAbortedError" };
      await f.idle(); expect(f.calls.length).toBe(0);
      delete f.messages[1].info.error;
      await f.hooks.event({ event: { type: "session.error", properties: { sessionID: "s1" } } });
      await f.idle(); expect(f.calls.length).toBe(0);
    } finally { await f.cleanup(); }
  });
  test("cancellation or new user message during evaluation invalidates continuation", async () => {
    let evaluated!: () => void; let release!: () => void;
    const started = new Promise<void>(resolve => { evaluated = resolve; });
    const hold = new Promise<void>(resolve => { release = resolve; });
    const f = await fixture(async (_root, script) => {
      if (script !== "hammertime.py") return {};
      evaluated(); await hold; return { decision: "block", reason: "Continue" };
    });
    try {
      const pending = f.idle(); await started;
      await f.hooks["chat.message"]({ sessionID: "s1" }, { parts: [{ type: "text", text: "Stop that work" }] });
      release(); await pending; expect(f.calls.length).toBe(0);
    } finally { release(); await f.cleanup(); }
  });
  test("finite cap survives synthetic chat.message events", async () => {
    const f = await fixture(async (_root, script) => script === "hammertime.py" ? { decision: "block", reason: "Timer active" } : {});
    try {
      for (let index = 0; index < 7; index++) {
        f.messages[1].info.id = `a${index}`;
        const count = f.calls.length;
        await f.idle();
        const submitted = f.calls.at(-1);
        if (f.calls.length > count) await f.hooks["chat.message"]({ sessionID: "s1" }, { parts: submitted.body.parts });
      }
      expect(f.calls.length).toBe(5);
    } finally { await f.cleanup(); }
  });
});

test('real core shell guard allows harmless input and blocks destructive input without executing it', async()=>{
 const project=await mkdtemp(join(tmpdir(),'bopen-real-guard-'));
 await mkdir(join(project,'.opencode'));
 await writeFile(join(project,'.opencode/bopen-hooks.json'),JSON.stringify({hooks:{bouncer:true,'damage-control':true,'publish-gate':true}}));
 const hooks=createHooks({client:{},directory:project,worktree:project},[join(import.meta.dir,'..')]);
 try {
  await hooks['tool.execute.before']({tool:'bash',sessionID:'guard-test'},{args:{command:'echo hello'}});
  await expect(hooks['tool.execute.before']({tool:'bash',sessionID:'guard-test'},{args:{command:'rm -rf /'}})).rejects.toThrow();
  await expect(hooks['tool.execute.before']({tool:'read',sessionID:'guard-test'},{args:{filePath:join(project,'.env')}})).rejects.toThrow();
 }finally{await hooks.dispose();await rm(project,{recursive:true,force:true});}
});
test('matching hook filenames in arbitrary modules are never executed',async()=>{
 const f=await fixture(async()=>{throw new Error('should not execute')});
 const hooks=createHooks({client:{},directory:f.root,worktree:f.root},[f.root]);
 try{await hooks['tool.execute.before']({tool:'bash',sessionID:'s'},{args:{command:'echo hello'}});}
 finally{await hooks.dispose();await f.cleanup();}
});
