import { describe, expect, test } from "bun:test";
import { emitPlan } from "./emitter";

function makeState(overrides: Record<string, unknown> = {}, plugins: any[] = []): any {
  return {
    runtimeArg: "claude",
    runtimeDetected: "claude",
    platform: "darwin",
    generatedAt: "2026-07-13T00:00:00.000Z",
    plugins,
    marketplace: { fetched: true, error: null, fetchedAt: "2026-07-13T00:00:00.000Z" },
    ...overrides,
  };
}

function makePlugin(overrides: Record<string, unknown> = {}): any {
  return {
    name: "bopen-tools",
    installedClaude: null,
    installedCodex: null,
    marketplaceVersion: null,
    hasSetupManifest: true,
    checks: [],
    hooks: [],
    ...overrides,
  };
}

describe("emitPlan", () => {
  test("empty diff produces header and footer only, no section headings", () => {
    const plugin = makePlugin({ installedClaude: "1.0.0", marketplaceVersion: "1.0.0" });
    const state = makeState({}, [plugin]);
    const selections = {
      runtime: "claude",
      plugins: [{ name: "bopen-tools", installPlugin: true, checks: [], hooks: {} }],
    };

    const plan = emitPlan(state, selections);

    expect(plan).toContain("# bOpen Setup Plan");
    expect(plan).toContain("Execute via Skill(bopen-tools:coordinator)");
    expect(plan).not.toContain("## ");
  });

  test("claude and codex use different install dialects for the same selection", () => {
    const plugin = makePlugin({ installedClaude: null, installedCodex: null });
    const state = makeState({}, [plugin]);
    const basePlugins = [{ name: "bopen-tools", installPlugin: true, checks: [], hooks: {} }];

    const claudePlan = emitPlan(state, { runtime: "claude", plugins: basePlugins });
    const codexPlan = emitPlan(state, { runtime: "codex", plugins: basePlugins });

    expect(claudePlan).toContain("claude plugin install bopen-tools@b-open-io");
    expect(claudePlan).not.toContain("codex plugin");

    expect(codexPlan).toContain("codex plugin marketplace upgrade");
    expect(codexPlan).toContain("codex plugin add bopen-tools@b-open-io");
    expect(codexPlan).not.toContain("claude plugin install");
  });

  test("hermes agents selection reports not deliverable", () => {
    const plugin = makePlugin({
      checks: [
        {
          id: "codex-agents:bopen-tools",
          kind: "codex-agents",
          name: "agents",
          installed: false,
          install: "bash scripts/setup.sh",
        },
      ],
    });
    const state = makeState({}, [plugin]);
    const selections = {
      runtime: "hermes",
      plugins: [
        {
          name: "bopen-tools",
          installPlugin: false,
          checks: ["codex-agents:bopen-tools"],
          hooks: {},
        },
      ],
    };

    const plan = emitPlan(state, selections);

    expect(plan).toContain("not deliverable on this runtime");
  });

  test("missing CLI on darwin picks the darwin install; falls back to the lone other-platform command with a hint", () => {
    const pluginBothPlatforms = makePlugin({
      checks: [
        {
          id: "cli:ffmpeg",
          kind: "cli",
          name: "ffmpeg",
          installed: false,
          install: { darwin: "brew install ffmpeg", linux: "apt install ffmpeg" },
          checkCommand: "ffmpeg -version",
        },
      ],
    });
    const selections = {
      runtime: "claude",
      plugins: [{ name: "bopen-tools", installPlugin: false, checks: ["cli:ffmpeg"], hooks: {} }],
    };

    const planDarwin = emitPlan(makeState({ platform: "darwin" }, [pluginBothPlatforms]), selections);
    expect(planDarwin).toContain("brew install ffmpeg");
    expect(planDarwin).not.toContain("platform hint");

    const pluginLinuxOnly = makePlugin({
      checks: [
        {
          id: "cli:ffmpeg",
          kind: "cli",
          name: "ffmpeg",
          installed: false,
          install: { linux: "apt install ffmpeg" },
          checkCommand: "ffmpeg -version",
        },
      ],
    });

    const planFallback = emitPlan(makeState({ platform: "darwin" }, [pluginLinuxOnly]), selections);
    expect(planFallback).toContain("apt install ffmpeg");
    expect(planFallback).toContain("platform hint");
  });

  test("hooks diff emits the ask-tier sentence verbatim and the full target config", () => {
    const plugin = makePlugin({
      hooks: [
        { name: "guard-a", enabled: true, summary: "blocks x", runtimes: ["claude"] },
        { name: "guard-b", enabled: false, summary: "blocks y", runtimes: ["claude"] },
      ],
    });
    const state = makeState({}, [plugin]);
    const selections = {
      runtime: "claude",
      plugins: [
        { name: "bopen-tools", installPlugin: false, checks: [], hooks: { "guard-a": false } },
      ],
    };

    const plan = emitPlan(state, selections);

    expect(plan).toContain(
      "Hook configuration is ask-tier: confirm with the user before writing this file.",
    );
    expect(plan).toContain('"guard-a": false');
    expect(plan).toContain('"guard-b": false');
  });

  test("env key section never contains the detected value", () => {
    const plugin = makePlugin({
      checks: [
        {
          id: "env:ELEVENLABS_API_KEY",
          kind: "env",
          name: "ELEVENLABS_API_KEY",
          installed: false,
          detail: "sk-should-never-appear-in-plan",
          obtain: "https://elevenlabs.io -> Profile -> API Keys",
        },
      ],
    });
    const state = makeState({}, [plugin]);
    const selections = {
      runtime: "claude",
      plugins: [
        {
          name: "bopen-tools",
          installPlugin: false,
          checks: ["env:ELEVENLABS_API_KEY"],
          hooks: {},
        },
      ],
    };

    const plan = emitPlan(state, selections);

    expect(plan).toContain("export ELEVENLABS_API_KEY=...");
    expect(plan).not.toContain("sk-should-never-appear-in-plan");
  });

  test("identical inputs produce a strictly equal plan", () => {
    const plugin = makePlugin({
      installedClaude: null,
      checks: [
        {
          id: "cli:ffmpeg",
          kind: "cli",
          name: "ffmpeg",
          installed: false,
          install: "brew install ffmpeg",
          checkCommand: "ffmpeg -version",
        },
      ],
      hooks: [{ name: "guard-a", enabled: true, summary: "x", runtimes: ["claude"] }],
    });
    const state = makeState({}, [plugin]);
    const selections = {
      runtime: "claude",
      plugins: [
        {
          name: "bopen-tools",
          installPlugin: true,
          checks: ["cli:ffmpeg"],
          hooks: { "guard-a": false },
        },
      ],
    };

    const first = emitPlan(state, selections);
    const second = emitPlan(state, selections);

    expect(first).toBe(second);
  });
});
