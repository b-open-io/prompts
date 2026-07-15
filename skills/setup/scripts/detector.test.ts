import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  detectHarness,
  detectRuntime,
  evaluateCheck,
  fetchMarketplaceCatalog,
  listInstalledPlugins,
  listPortableSkills,
  readSkillActivity,
  resolveHookConfigPaths,
  resolveHookEnabled,
  resolveInstall,
} from "./detector";
import { isRuntime, RUNTIMES, RUNTIME_IDS } from "./runtimes";

describe("runtime registry", () => {
  test("is the canonical ordered runtime and tier list", () => {
    expect(RUNTIMES).toEqual([
      { id: "claude", label: "Claude Code", tier: "supported" },
      { id: "codex", label: "Codex", tier: "supported" },
      { id: "grok", label: "Grok Build", tier: "supported" },
      { id: "opencode", label: "OpenCode", tier: "experimental" },
      { id: "hermes", label: "Hermes", tier: "experimental" },
      { id: "generic", label: "Generic", tier: "fallback" },
    ]);
    expect(RUNTIME_IDS).toEqual(RUNTIMES.map((runtime) => runtime.id));
    expect(RUNTIME_IDS.every(isRuntime)).toBe(true);
    expect(isRuntime("unknown")).toBe(false);
  });
});

describe("evaluateCheck", () => {
  test("env form reports installed when the var is set and non-empty", async () => {
    const result = await evaluateCheck("env:SOME_KEY", { env: { SOME_KEY: "value" } });
    expect(result.installed).toBe(true);
  });

  test("env form reports not installed when the var is unset", async () => {
    const result = await evaluateCheck("env:SOME_KEY", { env: {} });
    expect(result.installed).toBe(false);
  });

  test("env form never leaks the value into detail", async () => {
    const result = await evaluateCheck("env:SECRET_KEY", { env: { SECRET_KEY: "super-secret-value" } });
    expect(JSON.stringify(result)).not.toContain("super-secret-value");
  });

  describe("path form", () => {
    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), "detector-path-"));
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    test("matches an existing file", async () => {
      const file = join(dir, "fixture.txt");
      await writeFile(file, "hello");
      const result = await evaluateCheck(`path:${file}`);
      expect(result.installed).toBe(true);
    });

    test("reports not installed for a missing path", async () => {
      const result = await evaluateCheck(`path:${join(dir, "does-not-exist.txt")}`);
      expect(result.installed).toBe(false);
    });
  });

  describe("command form", () => {
    test("succeeds for a zero-exit command", async () => {
      const result = await evaluateCheck("true");
      expect(result.installed).toBe(true);
    });

    test("fails for a nonzero-exit command", async () => {
      const result = await evaluateCheck("false");
      expect(result.installed).toBe(false);
    });

    test("fails for a nonexistent binary", async () => {
      const result = await evaluateCheck("this-binary-definitely-does-not-exist-xyz");
      expect(result.installed).toBe(false);
    });
  });
});

describe("pack dependency discovery", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "detector-pack-deps-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("scans plugins across every marketplace cache", async () => {
    await Promise.all([
      mkdir(join(dir, "b-open-io", "bopen-tools", "1.1.70"), { recursive: true }),
      mkdir(join(dir, "trailofbits", "static-analysis", "2.0.0"), { recursive: true }),
      mkdir(join(dir, "claude-plugins-official", "stripe", "1.0.0"), { recursive: true }),
      mkdir(join(dir, "temp_subdir_123.clone", ".git", "objects"), { recursive: true }),
    ]);

    const installed = await listInstalledPlugins(dir);
    expect(installed.get("bopen-tools")?.marketplace).toBe("b-open-io");
    expect(installed.get("static-analysis")?.marketplace).toBe("trailofbits");
    expect(installed.get("stripe")?.version).toBe("1.0.0");
    expect(installed.has(".git")).toBe(false);
  });

  test("merges portable skill directories and symlinks", async () => {
    const shared = join(dir, "shared");
    const claude = join(dir, "claude");
    await mkdir(join(shared, "react-doctor"), { recursive: true });
    await mkdir(join(claude, "webapp-testing"), { recursive: true });

    const skills = await listPortableSkills([shared, claude, join(dir, "missing")]);
    expect(skills).toEqual(["react-doctor", "webapp-testing"]);
  });
});

describe("detectRuntime", () => {
  // No test in this block relies on the real filesystem for grok/hermes —
  // staticSignals overrides those checks outright, since this exact
  // ambiguity (live signal + real static installs coexisting on the
  // detector's own dev machine) is the bug this precedence rule fixes.
  const noStatic = { grokPresent: false, hermesPresent: false };

  test("detects claude via CLAUDECODE", () => {
    expect(detectRuntime({ CLAUDECODE: "1" }, noStatic)).toBe("claude");
  });

  test("detects codex via CODEX_SANDBOX", () => {
    expect(detectRuntime({ CLAUDECODE: undefined, CODEX_SANDBOX: "1" }, noStatic)).toBe("codex");
  });

  test("detects codex via CODEX_HOME", () => {
    expect(detectRuntime({ CLAUDECODE: undefined, CODEX_HOME: "/tmp/codex" }, noStatic)).toBe("codex");
  });

  test("detects opencode via OPENCODE", () => {
    expect(detectRuntime({ CLAUDECODE: undefined, OPENCODE: "1" }, noStatic)).toBe("opencode");
  });

  test("detects opencode via AGENT", () => {
    expect(detectRuntime({ CLAUDECODE: undefined, AGENT: "opencode" }, noStatic)).toBe("opencode");
  });

  test("falls back to generic when no signals fire at all", () => {
    expect(
      detectRuntime(
        { CLAUDECODE: undefined, CODEX_SANDBOX: undefined, CODEX_HOME: undefined, OPENCODE: undefined, AGENT: undefined },
        noStatic
      )
    ).toBe("generic");
  });

  test("falls back to generic when multiple live signals fire at once", () => {
    expect(detectRuntime({ CLAUDECODE: "1", CODEX_SANDBOX: "1" }, noStatic)).toBe("generic");
  });

  test("live signal wins outright over a coexisting static signal (claude + grok installed)", () => {
    expect(detectRuntime({ CLAUDECODE: "1" }, { grokPresent: true, hermesPresent: false })).toBe("claude");
  });

  test("zero live signals + exactly one static signal resolves to that runtime (hermes)", () => {
    expect(
      detectRuntime(
        { CLAUDECODE: undefined, CODEX_SANDBOX: undefined, CODEX_HOME: undefined, OPENCODE: undefined, AGENT: undefined },
        { grokPresent: false, hermesPresent: true }
      )
    ).toBe("hermes");
  });

  test("both CLAUDECODE and OPENCODE set is a live-signal conflict → generic", () => {
    expect(detectRuntime({ CLAUDECODE: "1", OPENCODE: "1" }, noStatic)).toBe("generic");
  });

  test("zero live + multiple static signals is also a conflict → generic", () => {
    expect(
      detectRuntime(
        { CLAUDECODE: undefined, CODEX_SANDBOX: undefined, CODEX_HOME: undefined, OPENCODE: undefined, AGENT: undefined },
        { grokPresent: true, hermesPresent: true }
      )
    ).toBe("generic");
  });
});

describe("skill activity", () => {
  let dir: string;
  const nowSeconds = 1_800_000_000;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "detector-skill-activity-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("parses valid JSONL records, ignores malformed lines, and aggregates against an injected clock", async () => {
    const activityFile = join(dir, "activity.jsonl");
    await writeFile(
      activityFile,
      [
        JSON.stringify({ ts: nowSeconds - 90_000, session_id: "old-session", skill: "bopen-tools:advisor" }),
        "not json",
        JSON.stringify({ ts: nowSeconds - 120, session_id: "first-recent", skill: "bopen-tools:advisor" }),
        JSON.stringify({ ts: nowSeconds - 60, session_id: "latest-session", skill: "bopen-tools:advisor" }),
        JSON.stringify({ ts: nowSeconds - 30, session_id: "missing-skill" }),
        JSON.stringify({ ts: "not-a-number", session_id: "bad-ts", skill: "bopen-tools:ignored" }),
        JSON.stringify({ ts: nowSeconds - 10, session_id: "other-session", skill: "other-plugin:helper" }),
      ].join("\n")
    );

    const activity = readSkillActivity({
      env: {
        BOPEN_SKILL_ACTIVITY_FILE: activityFile,
        BOPEN_CLAUDE_PROJECTS_DIR: join(dir, "projects"),
      },
      nowSeconds,
    });

    expect(activity["bopen-tools:advisor"]).toEqual({
      lastInvokedAt: nowSeconds - 60,
      sessionId: "latest-session",
      count24h: 2,
      isLive: false,
    });
    expect(activity["other-plugin:helper"]).toEqual({
      lastInvokedAt: nowSeconds - 10,
      sessionId: "other-session",
      count24h: 1,
      isLive: false,
    });
    expect(activity["bopen-tools:ignored"]).toBeUndefined();
  });

  test("missing or unreadable activity data is an empty object", () => {
    expect(
      readSkillActivity({
        env: { BOPEN_SKILL_ACTIVITY_FILE: join(dir, "does-not-exist.jsonl") },
        nowSeconds,
      })
    ).toEqual({});
  });

  test("marks only a latest-session transcript modified within 120 seconds as live", async () => {
    const activityFile = join(dir, "activity.jsonl");
    const projectsDir = join(dir, "projects");
    const slug = join(projectsDir, "-Users-example-project");
    await mkdir(slug, { recursive: true });
    await writeFile(
      activityFile,
      [
        JSON.stringify({ ts: nowSeconds - 300, session_id: "older-live", skill: "bopen-tools:advisor" }),
        JSON.stringify({ ts: nowSeconds - 60, session_id: "latest-live", skill: "bopen-tools:advisor" }),
        JSON.stringify({ ts: nowSeconds - 30, session_id: "stale-session", skill: "bopen-tools:hook-manager" }),
        JSON.stringify({ ts: nowSeconds - 20, session_id: "missing-session", skill: "bopen-tools:persona" }),
      ].join("\n"),
    );

    const olderTranscript = join(slug, "older-live.jsonl");
    const latestTranscript = join(slug, "latest-live.jsonl");
    const staleTranscript = join(slug, "stale-session.jsonl");
    await Promise.all([
      writeFile(olderTranscript, "{}\n"),
      writeFile(latestTranscript, "{}\n"),
      writeFile(staleTranscript, "{}\n"),
    ]);
    await utimes(olderTranscript, nowSeconds - 10, nowSeconds - 10);
    await utimes(latestTranscript, nowSeconds - 120, nowSeconds - 120);
    await utimes(staleTranscript, nowSeconds - 121, nowSeconds - 121);

    const activity = readSkillActivity({
      env: {
        BOPEN_SKILL_ACTIVITY_FILE: activityFile,
        BOPEN_CLAUDE_PROJECTS_DIR: projectsDir,
      },
      nowSeconds,
    });

    expect(activity["bopen-tools:advisor"].sessionId).toBe("latest-live");
    expect(activity["bopen-tools:advisor"].isLive).toBe(true);
    expect(activity["bopen-tools:hook-manager"].isLive).toBe(false);
    expect(activity["bopen-tools:persona"].isLive).toBe(false);
  });

  test("rejects future transcript mtimes and unsafe session ids", async () => {
    const activityFile = join(dir, "activity.jsonl");
    const projectsDir = join(dir, "projects");
    const slug = join(projectsDir, "project");
    await mkdir(slug, { recursive: true });
    await writeFile(
      activityFile,
      [
        JSON.stringify({ ts: nowSeconds - 10, session_id: "future-session", skill: "bopen-tools:advisor" }),
        JSON.stringify({ ts: nowSeconds - 5, session_id: "../escape", skill: "bopen-tools:persona" }),
      ].join("\n"),
    );
    const transcript = join(slug, "future-session.jsonl");
    await writeFile(transcript, "{}\n");
    await utimes(transcript, nowSeconds + 1, nowSeconds + 1);

    const activity = readSkillActivity({
      env: {
        BOPEN_SKILL_ACTIVITY_FILE: activityFile,
        BOPEN_CLAUDE_PROJECTS_DIR: projectsDir,
      },
      nowSeconds,
    });

    expect(activity["bopen-tools:advisor"].isLive).toBe(false);
    expect(activity["bopen-tools:persona"].isLive).toBe(false);
  });

  test("detectHarness attaches full skill ids only to their exact plugin namespace", async () => {
    const activityFile = join(dir, "activity.jsonl");
    await writeFile(
      activityFile,
      [
        JSON.stringify({ ts: nowSeconds - 60, session_id: "bopen-session", skill: "bopen-tools:advisor" }),
        JSON.stringify({ ts: nowSeconds - 30, session_id: "similar-session", skill: "bopen-tools-extra:helper" }),
      ].join("\n")
    );

    const state = await detectHarness({
      runtimeArg: "generic",
      marketplaceCache: {
        fetched: true,
        error: null,
        fetchedAt: "2027-01-15T00:00:00.000Z",
        versions: new Map([
          ["bopen-tools", "1.0.0"],
          ["bopen-tools-extra", "1.0.0"],
          ["no-activity", "1.0.0"],
        ]),
      },
      env: {
        BOPEN_SKILL_ACTIVITY_FILE: activityFile,
        BOPEN_CLAUDE_PROJECTS_DIR: join(dir, "projects"),
      },
      nowSeconds,
    });

    expect(state.plugins.find((plugin) => plugin.name === "bopen-tools")?.skillActivity).toEqual({
      "bopen-tools:advisor": {
        lastInvokedAt: nowSeconds - 60,
        sessionId: "bopen-session",
        count24h: 1,
        isLive: false,
      },
    });
    expect(state.plugins.find((plugin) => plugin.name === "bopen-tools-extra")?.skillActivity).toEqual({
      "bopen-tools-extra:helper": {
        lastInvokedAt: nowSeconds - 30,
        sessionId: "similar-session",
        count24h: 1,
        isLive: false,
      },
    });
    expect(state.plugins.find((plugin) => plugin.name === "no-activity")?.skillActivity).toEqual({});
  });
});

describe("hook enable/disable resolution", () => {
  let dir: string;
  const originalConfigEnv = process.env.BOPEN_HOOKS_CONFIG;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "detector-hooks-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    if (originalConfigEnv === undefined) {
      delete process.env.BOPEN_HOOKS_CONFIG;
    } else {
      process.env.BOPEN_HOOKS_CONFIG = originalConfigEnv;
    }
  });

  test("explicit false disables the named hook", async () => {
    const cfg = join(dir, "bopen-hooks-config.json");
    await writeFile(cfg, JSON.stringify({ hooks: { bouncer: false } }));
    process.env.BOPEN_HOOKS_CONFIG = cfg;

    const paths = resolveHookConfigPaths(process.env);
    expect(paths[0]).toBe(cfg);
    expect(resolveHookEnabled("bouncer", paths)).toBe(false);
  });

  test("a missing key in the config means enabled", async () => {
    const cfg = join(dir, "bopen-hooks-config.json");
    await writeFile(cfg, JSON.stringify({ hooks: { bouncer: false } }));
    process.env.BOPEN_HOOKS_CONFIG = cfg;

    const paths = resolveHookConfigPaths(process.env);
    expect(resolveHookEnabled("hammertime", paths)).toBe(true);
  });

  test("a missing config file means enabled", () => {
    delete process.env.BOPEN_HOOKS_CONFIG;
    const paths = resolveHookConfigPaths({ BOPEN_HOOKS_CONFIG: join(dir, "does-not-exist.json") });
    expect(resolveHookEnabled("bouncer", paths)).toBe(true);
  });

  test("explicit true enables the named hook", async () => {
    const cfg = join(dir, "bopen-hooks-config.json");
    await writeFile(cfg, JSON.stringify({ hooks: { bouncer: true } }));
    const paths = resolveHookConfigPaths({ BOPEN_HOOKS_CONFIG: cfg });
    expect(resolveHookEnabled("bouncer", paths)).toBe(true);
  });
});

describe("fetchMarketplaceCatalog", () => {
  test("parses a { plugins: [...] } shape from a local fixture server", async () => {
    const fixture = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({ plugins: [{ name: "bopen-tools", version: "1.2.3" }, { name: "no-version-field" }] });
      },
    });

    try {
      const result = await fetchMarketplaceCatalog(`http://127.0.0.1:${fixture.port}`);
      expect(result.fetched).toBe(true);
      expect(result.error).toBeNull();
      expect(result.fetchedAt).not.toBeNull();
      expect(result.versions.get("bopen-tools")).toBe("1.2.3");
      expect(result.versions.has("no-version-field")).toBe(false);
    } finally {
      fixture.stop(true);
    }
  });

  test("parses a bare array shape from a local fixture server", async () => {
    const fixture = Bun.serve({
      port: 0,
      fetch() {
        return Response.json([{ name: "bopen-tools", version: "9.9.9" }]);
      },
    });

    try {
      const result = await fetchMarketplaceCatalog(`http://127.0.0.1:${fixture.port}`);
      expect(result.fetched).toBe(true);
      expect(result.versions.get("bopen-tools")).toBe("9.9.9");
    } finally {
      fixture.stop(true);
    }
  });

  test("reports a fetch error with no fake data on an unrecognized shape", async () => {
    const fixture = Bun.serve({
      port: 0,
      fetch() {
        return Response.json({ unexpected: "shape" });
      },
    });

    try {
      const result = await fetchMarketplaceCatalog(`http://127.0.0.1:${fixture.port}`);
      expect(result.fetched).toBe(false);
      expect(result.error).not.toBeNull();
      expect(result.fetchedAt).toBeNull();
      expect(result.versions.size).toBe(0);
    } finally {
      fixture.stop(true);
    }
  });

  test("reports a fetch error with no fake data when the connection is refused", async () => {
    // Port 1 is a reserved, unlistened loopback port — refuses instantly,
    // no real network access and no long timeout wait.
    const result = await fetchMarketplaceCatalog("http://127.0.0.1:1");
    expect(result.fetched).toBe(false);
    expect(result.error).not.toBeNull();
    expect(result.fetchedAt).toBeNull();
  });
});

describe("resolveInstall (platform-resolution fallback chain)", () => {
  test("picks the exact platform entry when present", () => {
    const result = resolveInstall({ darwin: "brew install ffmpeg", linux: "apt install ffmpeg" }, "darwin");
    expect(result.install).toBe("brew install ffmpeg");
    expect(result.installNote).toBeUndefined();
  });

  test("falls back to 'any' when the platform has no dedicated entry", () => {
    const result = resolveInstall({ any: "npm install -g agent-browser" }, "darwin");
    expect(result.install).toBe("npm install -g agent-browser");
    expect(result.installNote).toBeUndefined();
  });

  test("prefers the exact platform entry over 'any' when both exist", () => {
    const result = resolveInstall({ any: "npm install -g x", darwin: "brew install x" }, "darwin");
    expect(result.install).toBe("brew install x");
    expect(result.installNote).toBeUndefined();
  });

  test("falls back to another platform's entry and flags it with installNote", () => {
    const result = resolveInstall({ linux: "sudo apt install ffmpeg" }, "darwin");
    expect(result.install).toBe("sudo apt install ffmpeg");
    expect(result.installNote).toBe("linux command; adapt for darwin");
  });

  test("returns nothing for an undefined install map", () => {
    const result = resolveInstall(undefined, "darwin");
    expect(result.install).toBeUndefined();
    expect(result.installNote).toBeUndefined();
  });
});
