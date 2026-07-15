import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installCommandForRuntime, loadPackState, type PackPlugin } from "./pack";

describe("pack dependency pass", () => {
  let home: string;

  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), "bopen-pack-pass-"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  test("loads the shipped pack.json contract and reports every harness independently", async () => {
    const manifest = join(home, "pack.json");
    await writeFile(
      manifest,
      JSON.stringify({
        packId: "test-pack",
        name: "Test Pack",
        playbooks: [{ id: "fixture", file: "playbooks/fixture.md" }],
        plugins: [
          {
            name: "bopen-tools",
            marketplace: "b-open-io",
            source: "b-open-io/claude-plugins",
            install: "claude plugin install bopen-tools@b-open-io"
          },
          {
            name: "shadcn",
            marketplace: "portable-skill",
            source: "shadcn/ui",
            install: "npx skills add shadcn/ui --skill shadcn"
          }
        ]
      })
    );
    await Promise.all([
      mkdir(join(home, ".claude", "plugins", "cache", "b-open-io", "bopen-tools", "1.2.3"), {
        recursive: true
      }),
      mkdir(join(home, ".agents", "skills", "shadcn"), { recursive: true })
    ]);

    const state = await loadPackState(manifest, { home });

    expect(state.dependencies.map((dependency) => dependency.name)).toEqual(["bopen-tools", "shadcn"]);
    expect(state.dependencies[0].runtimes.claude.installedVersion).toBe("1.2.3");
    expect(state.dependencies[0].runtimes.codex.installed).toBe(false);
    expect(state.dependencies[0].runtimes.grok.installed).toBe(true);
    expect(state.dependencies[1].runtimes.claude.installed).toBe(true);
    expect(state.dependencies[1].runtimes.codex.installed).toBe(true);
  });

  test("derives a ToC closure from known marketplace metadata and package-manager locks", async () => {
    const toc = join(home, "design-brand.json");
    await writeFile(
      toc,
      JSON.stringify({
        slug: "design-brand",
        name: "Design & Brand",
        playbooks: [{ skills: ["static-analysis:semgrep", "shadcn", "static-analysis:codeql"] }]
      })
    );
    const marketplace = join(home, ".claude", "plugins", "marketplaces", "trailofbits");
    await mkdir(join(marketplace, ".claude-plugin"), { recursive: true });
    await writeFile(
      join(marketplace, ".claude-plugin", "marketplace.json"),
      JSON.stringify({ name: "trailofbits", plugins: [{ name: "static-analysis" }] })
    );
    await mkdir(join(home, ".claude", "plugins"), { recursive: true });
    await writeFile(
      join(home, ".claude", "plugins", "known_marketplaces.json"),
      JSON.stringify({
        trailofbits: { source: { source: "github", repo: "trailofbits/skills" } }
      })
    );
    const packageLock = join(home, ".codex", ".tmp", "marketplaces", "b-open-io");
    await mkdir(packageLock, { recursive: true });
    await writeFile(
      join(packageLock, "skills-lock.json"),
      JSON.stringify({ skills: { shadcn: { source: "shadcn/ui" } } })
    );

    const state = await loadPackState(toc, { home });

    expect(state.inputKind).toBe("toc");
    expect(state.skillIds).toEqual(["static-analysis:semgrep", "shadcn", "static-analysis:codeql"]);
    expect(state.dependencies.map(({ name, marketplace }) => ({ name, marketplace }))).toEqual([
      { name: "static-analysis", marketplace: "trailofbits" },
      { name: "shadcn", marketplace: "portable-skill" }
    ]);
  });

  test("fails loudly when a ToC prefix cannot be resolved", async () => {
    const toc = join(home, "broken.json");
    await writeFile(toc, JSON.stringify({ slug: "broken", playbooks: [{ skills: ["unknown-plugin:skill"] }] }));
    expect(loadPackState(toc, { home })).rejects.toThrow("unresolved plugin prefixes unknown-plugin");
  });
});

describe("exact harness commands", () => {
  const plugin: PackPlugin = {
    name: "stripe",
    marketplace: "claude-plugins-official",
    source: "anthropics/claude-plugins-official",
    install: "claude plugin install stripe@claude-plugins-official"
  };

  test("adds a missing marketplace before the Claude install", () => {
    expect(installCommandForRuntime(plugin, "claude", false)).toBe(
      "claude plugin marketplace add anthropics/claude-plugins-official\n" +
        "claude plugin install stripe@claude-plugins-official"
    );
  });

  test("uses the Codex marketplace and plugin dialect", () => {
    expect(installCommandForRuntime(plugin, "codex", false)).toBe(
      "codex plugin marketplace add anthropics/claude-plugins-official\n" +
        "codex plugin marketplace upgrade\n" +
        "codex plugin add stripe@claude-plugins-official"
    );
  });

  test("targets the requested portable-skill harness globally", () => {
    const portable: PackPlugin = {
      name: "shadcn",
      marketplace: "portable-skill",
      source: "shadcn/ui",
      install: "npx skills add shadcn/ui --skill shadcn"
    };
    expect(installCommandForRuntime(portable, "codex", true)).toBe(
      "npx skills add shadcn/ui --global --yes --agent codex --skill shadcn"
    );
    expect(installCommandForRuntime(portable, "grok", true)).toContain("--agent claude-code");
  });
});
