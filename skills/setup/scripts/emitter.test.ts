import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    name: "core",
    marketplace: "b-open-io",
    inCatalog: true,
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
  test("includes every missing pack dependency for the selected harness", () => {
    const state = makeState(
      {
        pack: {
          packId: "payments-blockchain",
          name: "Payments & Blockchain",
          inputKind: "manifest",
          skillIds: [],
          dependencies: [
            {
              name: "stripe",
              marketplace: "claude-plugins-official",
              source: "anthropics/claude-plugins-official",
              install: "claude plugin install stripe@claude-plugins-official",
              runtimes: {
                claude: {
                  installed: false,
                  installedVersion: null,
                  installCommand:
                    "claude plugin marketplace add anthropics/claude-plugins-official\nclaude plugin install stripe@claude-plugins-official",
                },
                codex: {
                  installed: false,
                  installedVersion: null,
                  installCommand:
                    "codex plugin marketplace add anthropics/claude-plugins-official\ncodex plugin marketplace upgrade\ncodex plugin add stripe@claude-plugins-official",
                },
                grok: {
                  installed: true,
                  installedVersion: "1.0.0",
                  installCommand: "claude plugin install stripe@claude-plugins-official",
                },
              },
            },
          ],
        },
      },
      [],
    );

    const plan = emitPlan(state, { runtime: "codex", plugins: [] });

    expect(plan).toContain("## Pack dependencies");
    expect(plan).toContain("codex plugin marketplace add anthropics/claude-plugins-official");
    expect(plan).toContain("codex plugin add stripe@claude-plugins-official");
    expect(plan).toContain("Required by pack payments-blockchain");
  });

  test("empty diff is still a self-contained execution prompt", () => {
    const plugin = makePlugin({ installedClaude: "1.0.0", marketplaceVersion: "1.0.0" });
    const state = makeState({}, [plugin]);
    const selections = {
      runtime: "claude",
      plugins: [{ name: "core", installPlugin: true, uninstallPlugin: false, checks: [], hooks: {} }],
    };

    const plan = emitPlan(state, selections);

    expect(plan).toContain("# bOpen Setup Execution Prompt");
    expect(plan).toContain("## Mission");
    expect(plan).toContain("## Execution rules");
    expect(plan).toContain("## Final verification and report");
    expect(plan).not.toContain("## Plugins");
    expect(plan).not.toContain("orchestra:coordinator");
    expect(plan).not.toContain("Refresh");
  });

  test("claude and codex use different install dialects for the same selection", () => {
    const plugin = makePlugin({ installedClaude: null, installedCodex: null });
    const state = makeState({}, [plugin]);
    const basePlugins = [{ name: "core", installPlugin: true, uninstallPlugin: false, checks: [], hooks: {} }];

    const claudePlan = emitPlan(state, { runtime: "claude", plugins: basePlugins });
    const codexPlan = emitPlan(state, { runtime: "codex", plugins: basePlugins });

    expect(claudePlan).toContain("claude plugin install core@b-open-io");
    expect(claudePlan).not.toContain("codex plugin");

    expect(codexPlan).toContain("codex plugin marketplace upgrade");
    expect(codexPlan).toContain("codex plugin add core@b-open-io");
    expect(codexPlan).not.toContain("claude plugin install");
  });

  test("hermes agents selection reports not deliverable", () => {
    const plugin = makePlugin({
      checks: [
        {
          id: "codex-agents:core",
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
          name: "core",
          installPlugin: false,
          uninstallPlugin: false,
          checks: ["codex-agents:core"],
          hooks: {},
        },
      ],
    };

    const plan = emitPlan(state, selections);

    expect(plan).toContain("not deliverable on this runtime");
  });

  test("missing CLI emits the detector-resolved command and its platform note", () => {
    const pluginBothPlatforms = makePlugin({
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
    });
    const selections = {
      runtime: "claude",
      plugins: [{ name: "core", installPlugin: false, checks: ["cli:ffmpeg"], hooks: {} }],
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
          install: "apt install ffmpeg",
          installNote: "linux command; adapt for darwin",
          checkCommand: "ffmpeg -version",
        },
      ],
    });

    const planFallback = emitPlan(makeState({ platform: "darwin" }, [pluginLinuxOnly]), selections);
    expect(planFallback).toContain("apt install ffmpeg");
    expect(planFallback).toContain("linux command; adapt for darwin");
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
        { name: "core", installPlugin: false, checks: [], hooks: { "guard-a": false } },
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
          name: "core",
          installPlugin: false,
          uninstallPlugin: false,
          checks: ["env:ELEVENLABS_API_KEY"],
          hooks: {},
        },
      ],
    };

    const plan = emitPlan(state, selections);

    expect(plan).toContain('export ELEVENLABS_API_KEY="<value supplied securely by the user>"');
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
          name: "core",
          installPlugin: true,
          uninstallPlugin: false,
          checks: ["cli:ffmpeg"],
          hooks: { "guard-a": false },
        },
      ],
    };

    const first = emitPlan(state, selections);
    const second = emitPlan(state, selections);

    expect(first).toBe(second);
  });

  test("never leaks detector paths and includes inline commands and verification", () => {
    const plugin = makePlugin({
      checks: [
        {
          id: "third-party-skill:example",
          kind: "third-party-skill",
          name: "example",
          installed: false,
          install: "npx skills add https://github.com/example/skills --skill example",
          checkCommand: "path:~/.claude/skills/example/SKILL.md",
          detail: "/Users/alice/private/repo/skill",
        },
        {
          id: "setup-script:research:persona",
          kind: "setup-script",
          name: "persona",
          installed: false,
          install: "bash scripts/setup-persona.sh",
          detail: "/Users/alice/private/repo/setup-persona.sh",
        },
      ],
    });
    const plan = emitPlan(makeState({}, [plugin]), {
      runtime: "claude",
      plugins: [
        {
          name: "core",
          installPlugin: false,
          uninstallPlugin: false,
          checks: ["third-party-skill:example", "setup-script:research:persona"],
          hooks: {},
        },
      ],
    });

    expect(plan).toContain("Command:");
    expect(plan).toContain("Verify:");
    expect(plan).toContain("$HOME/.claude/skills/example/SKILL.md");
    expect(plan).not.toContain("/Users/alice");
    expect(plan).not.toContain("bash bash");
    expect(plan).not.toContain("compgen");
    expect(plan).not.toContain('test "$?"');
    expect(plan).toContain("bopen-setup-core-persona.ok");
  });

  test("Codex agent delivery locates the portable installed root and verifies the manifest check", () => {
    const plugin = makePlugin({
      checks: [
        {
          id: "codex-agents",
          kind: "codex-agents",
          name: "codex agent delivery",
          installed: false,
          install: "bash scripts/install-codex-agents.sh",
          checkCommand: "path:~/.codex/agents/bopen_*.toml",
        },
      ],
    });
    const plan = emitPlan(makeState({}, [plugin]), {
      runtime: "codex",
      plugins: [
        {
          name: "core",
          installPlugin: false,
          uninstallPlugin: false,
          checks: ["codex-agents"],
          hooks: {},
        },
      ],
    });

    expect(plan).toContain('$HOME/.codex/plugins/cache/b-open-io/core');
    expect(plan).toContain("bash scripts/install-codex-agents.sh");
    expect(plan).toContain('$HOME/.codex/agents/bopen_*.toml');
  });
});

describe("grok dialect", () => {
  const grokState = (installedClaude: string | null) =>
    ({
      runtimeArg: "grok",
      runtimeDetected: "grok",
      platform: "darwin",
      generatedAt: "2026-07-13T00:00:00.000Z",
      plugins: [
        {
          name: "core",
          marketplace: "b-open-io",
          inCatalog: true,
          installedClaude,
          installedCodex: null,
          marketplaceVersion: "9.9.9",
          hasSetupManifest: false,
          checks: [],
          hooks: [],
          hooksConfigPath: null,
        },
      ],
      marketplace: { fetched: true, error: null, fetchedAt: null },
    }) as any;
  const grokSel = {
    runtime: "grok",
    plugins: [
      { name: "core", installPlugin: true, uninstallPlugin: false, checks: [], hooks: {} },
    ],
  } as any;

  test("stale Claude-compatible plugin emits an update with grok inspect verification", () => {
    const plan = emitPlan(grokState("1.1.47"), grokSel);
    expect(plan).toContain("claude plugin update core@b-open-io");
    expect(plan).toContain("grok inspect");
    expect(plan).not.toContain("grok plugin install");
  });

  test("no claude install emits native grok plugin install", () => {
    const plan = emitPlan(grokState(null), grokSel);
    expect(plan).toContain("grok plugin install b-open-io/prompts --trust");
    expect(plan).toContain("grok plugin details core");
  });
});

describe("plugin removals", () => {
  test("emits the runtime's uninstall command with a negative verify", () => {
    const plugin = makePlugin({ installedClaude: "1.0.0", installedCodex: "1.0.0", marketplace: "openai-curated-remote" });
    const state = makeState({}, [plugin]);
    const base = { name: "core", installPlugin: false, uninstallPlugin: true, checks: [], hooks: {} };

    const claudePlan = emitPlan(state, { runtime: "claude", plugins: [base] });
    expect(claudePlan).toContain("## Plugin removals");
    expect(claudePlan).toContain("claude plugin uninstall core@openai-curated-remote");
    expect(claudePlan).toContain('! claude plugin list | grep -qF "core@"');

    const codexPlan = emitPlan(state, { runtime: "codex", plugins: [base] });
    expect(codexPlan).toContain("codex plugin remove core");
    expect(codexPlan).not.toContain("claude plugin uninstall");
  });

  test("skips removals for runtimes where the plugin is not installed", () => {
    const plugin = makePlugin({ installedClaude: null, installedCodex: "1.0.0" });
    const plan = emitPlan(makeState({}, [plugin]), {
      runtime: "claude",
      plugins: [{ name: "core", installPlugin: false, uninstallPlugin: true, checks: [], hooks: {} }],
    });
    expect(plan).not.toContain("## Plugin removals");
  });
});


describe("OpenCode native plans", () => {
  const selection = { name: "core", installPlugin: true, uninstallPlugin: false, checks: [], hooks: {} };

  test("installed Claude never suppresses a native install or verifies it", () => {
    const plan = emitPlan(makeState({}, [makePlugin({ installedClaude: "9.9.9", marketplaceVersion: "9.9.9" })]), {
      runtime: "opencode", plugins: [selection],
    });
    expect(plan).toContain('bun "$BOPEN_SOURCE/opencode/install.ts" --plugin core --global');
    expect(plan).toContain("git -C \"$BOPEN_SOURCE\" merge --ff-only origin/HEAD");
    expect(plan).not.toContain("claude plugin");
    expect(plan).not.toContain("--all");
    expect(plan).toContain("opencode debug config");
    expect(plan).toContain("opencode debug skill");
    for (const match of plan.matchAll(/```sh\n([\s\S]*?)\n```/g)) {
      const result = Bun.spawnSync(["sh", "-n"], { stdin: Buffer.from(match[1]) });
      expect(result.exitCode).toBe(0);
    }
  });

  test("removal works independently of Claude installation state", () => {
    const plan = emitPlan(makeState({}, [makePlugin()]), {
      runtime: "opencode", plugins: [{ ...selection, installPlugin: false, uninstallPlugin: true }],
    });
    expect(plan).toContain("--plugin core --global --uninstall");
    expect(plan).not.toContain("claude plugin");
  });

  test("unsupported marketplaces do not get an invented native install", () => {
    const plan = emitPlan(makeState({}, [makePlugin({ marketplace: "third-party" })]), {
      runtime: "opencode", plugins: [selection],
    });
    expect(plan).toContain("native OpenCode delivery unavailable");
    expect(plan).not.toContain("--plugin core");
    expect(plan).not.toContain("claude plugin install");
  });
});


test("native verification checks selected roots, including removal of the last plugin", () => {
  const temp = mkdtempSync(join(tmpdir(), "bopen-setup-native-"));
  try {
    const root = join(temp, "data/bopen/opencode-source");
    const shim = join(temp, "config/opencode/plugins/bopen.ts");
    mkdirSync(join(temp, "config/opencode/plugins"), { recursive: true });
    const run = (remove: boolean) => {
      const plan = emitPlan(makeState({}, [makePlugin()]), {
        runtime: "opencode", plugins: [{ name: "core", installPlugin: !remove, uninstallPlugin: remove, checks: [], hooks: {} }],
      });
      const block = [...plan.matchAll(/```sh\n([\s\S]*?)\n```/g)].find((match) => match[1].includes("bun -e"))![1];
      // Run only the registry verification, leaving real CLI discovery to integration tests.
      return Bun.spawnSync(["sh", "-ec", block.split("\nopencode debug")[0]], {
        env: { ...process.env, XDG_CONFIG_HOME: join(temp, "config"), XDG_DATA_HOME: join(temp, "data") },
      }).exitCode;
    };
    expect(run(false)).not.toBe(0);
    writeFileSync(shim, `// bopen-managed: ${JSON.stringify({ schema: 1, adapter: root + "/opencode", roots: [root] })}\nexport default {};\n`);
    expect(run(false)).toBe(0);
    expect(run(true)).not.toBe(0);
    rmSync(shim);
    expect(run(true)).toBe(0);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('OpenCode hook-state script updates the nested hook map and preserves other settings', async()=>{
 const project=mkdtempSync(join(tmpdir(),'bopen-hook-config-'));
 try {
  mkdirSync(join(project,'.opencode'));
  writeFileSync(join(project,'.opencode/bopen-hooks.json'),JSON.stringify({note:'keep',hooks:{bouncer:false,'publish-gate':false}}));
  const plan=emitPlan(makeState({},[makePlugin()]),{runtime:'opencode',plugins:[{name:'core',installPlugin:false,uninstallPlugin:false,checks:[],hooks:{bouncer:true,hammertime:false}}]});
  const block=[...plan.matchAll(/```sh\n([\s\S]*?)\n```/g)].find(m=>m[1].startsWith("python3 - <<'PY'"));
  expect(block).toBeDefined();
  const result=Bun.spawnSync(['sh','-c',block![1]],{cwd:project});expect(result.exitCode).toBe(0);
  const config=await Bun.file(join(project,'.opencode/bopen-hooks.json')).json();
  expect(config).toEqual({note:'keep',hooks:{bouncer:true,'publish-gate':false,hammertime:false}});
 }finally{rmSync(project,{recursive:true,force:true});}
});
