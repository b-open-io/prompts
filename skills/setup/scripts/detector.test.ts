import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectRuntime, evaluateCheck, fetchMarketplaceCatalog, resolveHookConfigPaths, resolveHookEnabled, resolveInstall } from "./detector";

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
