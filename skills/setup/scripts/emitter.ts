// Pure plan emitter for the bopen setup installer (OPL-2850, Unit D).
// Diffs PlanSelections against HarnessState and renders a runtime-tailored
// markdown instruction plan. No I/O, no Date.now — see SPEC-OPL-2850-D.
import type { HarnessState, PlanSelections } from "./detector"; // sibling unit; type errors expected until it lands — report, don't fix. Mirror the types locally in a `types-fallback` comment block if needed for your own testing, but the import line ships as written.

/*
types-fallback (local reference only — detector.ts is canonical once it lands;
this documents two discrepancies found against SPEC-OPL-2850-CONTRACTS.md's
CheckState while implementing this unit's own spec, both reported in the
FINAL REPORT rather than silently patched over):

1. CONTRACTS.md types `CheckState.install` as a plain `string` ("copyable
   install command for the active platform" — i.e. already resolved by the
   detector). But SPEC-OPL-2850-D requires the EMITTER to do platform
   selection ("install command for state.platform, fall back to any, hint
   note when only another platform's command exists"), which only makes
   sense if `install` can carry multiple platform variants. This file
   accepts EITHER shape defensively: a plain string is emitted as-is
   (already resolved, no fallback logic applies); a Record<platform, string>
   is resolved here.

2. Neither CheckState nor PluginState carries the original manifest `check`
   command (the shell command / path glob / env key used to test presence)
   or the hooks-config.json target path — both needed verbatim by this
   unit's spec ("# verify: + the manifest check command", "target path from
   the manifest"). This file reads an optional `checkCommand` off CheckState
   and an optional `hooksConfigPath` off PluginState, falling back to
   `detail` and to the `~/.claude/<plugin>/hooks-config.json` convention
   from the design doc, respectively, when absent.

type Runtime = "claude" | "codex" | "opencode" | "grok" | "hermes" | "generic";
type CheckKind = "cli" | "env" | "third-party-skill" | "codex-agents" | "setup-script";
type CheckState = {
  id: string;
  kind: CheckKind;
  name: string;
  installed: boolean;
  detail?: string;
  install?: string | Record<string, string>;
  checkCommand?: string; // not in CONTRACTS.md — see discrepancy (2) above
  usedBy?: string[];
  obtain?: string;
};
type HookState = { name: string; enabled: boolean; summary: string; runtimes: string[] };
type PluginState = {
  name: string;
  installedClaude: string | null;
  installedCodex: string | null;
  marketplaceVersion: string | null;
  hasSetupManifest: boolean;
  checks: CheckState[];
  hooks: HookState[];
  hooksConfigPath?: string; // not in CONTRACTS.md — see discrepancy (2) above
};
*/

const MARKETPLACE = "b-open-io";

function findPlugin(state: any, name: string): any | undefined {
  return state.plugins.find((p: any) => p.name === name);
}

function resolveInstallCommand(
  install: string | Record<string, string> | undefined,
  platform: string,
): { command: string; hint: boolean } | null {
  if (!install) return null;
  if (typeof install === "string") return { command: install, hint: false };
  if (install[platform]) return { command: install[platform], hint: false };
  if (install.any) return { command: install.any, hint: false };
  const otherKeys = Object.keys(install).sort();
  if (otherKeys.length > 0) return { command: install[otherKeys[0]], hint: true };
  return null;
}

function claudeInstallLine(plugin: any): string | null {
  if (plugin.installedClaude === null) {
    return `- \`claude plugin install ${plugin.name}@${MARKETPLACE}\``;
  }
  if (plugin.marketplaceVersion !== null && plugin.marketplaceVersion !== plugin.installedClaude) {
    return `- \`claude plugin update ${plugin.name}@${MARKETPLACE}\` (installed ${plugin.installedClaude} -> ${plugin.marketplaceVersion})`;
  }
  return null;
}

function buildPluginsSection(state: any, selections: any, runtime: string): string[] | null {
  const lines: string[] = [];
  let codexUpgradeEmitted = false;

  for (const sel of selections.plugins) {
    if (!sel.installPlugin) continue;
    const plugin = findPlugin(state, sel.name);
    if (!plugin) continue;

    if (runtime === "claude") {
      const line = claudeInstallLine(plugin);
      if (line) lines.push(line);
      continue;
    }

    if (runtime === "codex") {
      const needsAction =
        plugin.installedCodex === null ||
        (plugin.marketplaceVersion !== null && plugin.marketplaceVersion !== plugin.installedCodex);
      if (needsAction) {
        if (!codexUpgradeEmitted) {
          lines.push("- `codex plugin marketplace upgrade`");
          codexUpgradeEmitted = true;
        }
        lines.push(`- \`codex plugin add ${sel.name}@${MARKETPLACE}\``);
      }
      continue;
    }

    if (runtime === "opencode") {
      const line = claudeInstallLine(plugin);
      if (line) {
        lines.push(line);
        lines.push(
          "  verify: OpenCode discovers Claude-Code-installed plugins natively",
        );
      }
      continue;
    }

    if (runtime === "grok") {
      // Grok Build reads Claude Code plugin installs zero-config (compat
      // passthrough); its native registry is a separate path for Grok-only
      // machines. `grok plugin list` is blind to compat-discovered plugins,
      // so verification for that path must use `grok inspect`.
      if (plugin.installedClaude !== null) {
        lines.push(
          `- ${sel.name}: already active in Grok Build via the Claude Code install — no separate install needed. Verify with \`grok inspect\` (Plugins section); \`grok plugin list\` only shows Grok-native installs and will not list it.`,
        );
      } else {
        lines.push(
          `- \`grok plugin install ${MARKETPLACE}/prompts --trust\``,
          `  verify: \`grok plugin details ${sel.name}\` (native installs appear in Grok's own registry)`,
        );
      }
      continue;
    }

    // hermes / generic — skills-only, portable
    const dest = runtime === "hermes" ? "~/.hermes/skills/" : "your skills directory";
    lines.push(
      `- ${sel.name}: no plugin install mechanism on this runtime — add its skills individually via \`npx skills add https://github.com/${MARKETPLACE}/${sel.name} --skill <skill-name>\` into ${dest}`,
    );
  }

  return lines.length > 0 ? lines : null;
}

function buildAgentsSection(state: any, selections: any, runtime: string): string[] | null {
  const lines: string[] = [];

  for (const sel of selections.plugins) {
    const plugin = findPlugin(state, sel.name);
    if (!plugin) continue;
    const agentChecks = plugin.checks.filter(
      (c: any) => c.kind === "codex-agents" && sel.checks.includes(c.id),
    );
    if (agentChecks.length === 0) continue;

    if (runtime === "codex") {
      for (const c of agentChecks) {
        if (c.installed || !c.install) continue;
        lines.push(`- ${plugin.name}: run \`${c.install}\` with bash from the installed plugin root`);
      }
    } else if (runtime === "claude" || runtime === "opencode" || runtime === "grok") {
      lines.push(`- ${plugin.name}: bundled — no action`);
    } else {
      lines.push(`- ${plugin.name}: not deliverable on this runtime`);
    }
  }

  return lines.length > 0 ? lines : null;
}

function buildCliSection(state: any, selections: any, platform: string): string[] | null {
  const lines: string[] = [];

  for (const sel of selections.plugins) {
    const plugin = findPlugin(state, sel.name);
    if (!plugin) continue;
    const cliChecks = plugin.checks.filter(
      (c: any) => c.kind === "cli" && sel.checks.includes(c.id) && !c.installed,
    );
    for (const c of cliChecks) {
      const resolved = resolveInstallCommand(c.install, platform);
      if (!resolved) continue;
      const usedBy = c.usedBy?.length ? ` (used by: ${c.usedBy.join(", ")})` : "";
      lines.push(`- ${c.name}${usedBy}`);
      lines.push(`  \`${resolved.command}\`${resolved.hint ? "  # platform hint" : ""}`);
      const verify = c.checkCommand ?? c.detail ?? "(see manifest check)";
      lines.push(`  # verify: \`${verify}\``);
    }
  }

  return lines.length > 0 ? lines : null;
}

function buildEnvSection(state: any, selections: any): string[] | null {
  const lines: string[] = [];

  for (const sel of selections.plugins) {
    const plugin = findPlugin(state, sel.name);
    if (!plugin) continue;
    const envChecks = plugin.checks.filter(
      (c: any) => c.kind === "env" && sel.checks.includes(c.id) && !c.installed,
    );
    for (const c of envChecks) {
      lines.push(`- ${c.name}: \`export ${c.name}=...\``);
      if (c.obtain) lines.push(`  obtain: ${c.obtain}`);
      lines.push("  persist this in your shell profile (~/.zshrc, ~/.bashrc, etc.)");
    }
  }

  return lines.length > 0 ? lines : null;
}

function buildThirdPartySkillsSection(state: any, selections: any): string[] | null {
  const lines: string[] = [];

  for (const sel of selections.plugins) {
    const plugin = findPlugin(state, sel.name);
    if (!plugin) continue;
    const checks = plugin.checks.filter(
      (c: any) => c.kind === "third-party-skill" && sel.checks.includes(c.id) && !c.installed,
    );
    for (const c of checks) {
      if (c.install) lines.push(`- ${c.name}: \`${c.install}\``);
    }
  }

  return lines.length > 0 ? lines : null;
}

function buildHooksSection(state: any, selections: any): string[] | null {
  const lines: string[] = [];

  for (const sel of selections.plugins) {
    const plugin = findPlugin(state, sel.name);
    if (!plugin) continue;
    const desiredEntries = Object.entries(sel.hooks ?? {});
    if (desiredEntries.length === 0) continue;

    const currentByName = new Map<string, boolean>(plugin.hooks.map((h: any) => [h.name, h.enabled]));
    const hasDiff = desiredEntries.some(([name, desired]) => currentByName.get(name) !== desired);
    if (!hasDiff) continue;

    const target: Record<string, boolean> = {};
    for (const h of plugin.hooks) target[h.name] = currentByName.get(h.name)!;
    for (const [name, desired] of desiredEntries) target[name] = desired as boolean;

    const sortedTarget: Record<string, boolean> = {};
    for (const name of Object.keys(target).sort()) sortedTarget[name] = target[name];

    const path = plugin.hooksConfigPath ?? `~/.claude/${plugin.name}/hooks-config.json`;

    lines.push(`- ${plugin.name}`);
    lines.push(`  Target path: \`${path}\``);
    lines.push("");
    lines.push("  Hook configuration is ask-tier: confirm with the user before writing this file.");
    lines.push("");
    lines.push("  ```json");
    lines.push(JSON.stringify(sortedTarget, null, 2));
    lines.push("  ```");
  }

  return lines.length > 0 ? lines : null;
}

function buildSkillSetupScriptsSection(state: any, selections: any): string[] | null {
  const lines: string[] = [];

  for (const sel of selections.plugins) {
    const plugin = findPlugin(state, sel.name);
    if (!plugin) continue;
    const checks = plugin.checks.filter(
      (c: any) => c.kind === "setup-script" && sel.checks.includes(c.id) && !c.installed,
    );
    for (const c of checks) {
      if (!c.install) continue;
      const purpose = c.detail ? ` — ${c.detail}` : "";
      lines.push(`- ${c.name}${purpose}: \`bash ${c.install}\``);
    }
  }

  return lines.length > 0 ? lines : null;
}

export function emitPlan(state: HarnessState, selections: PlanSelections): string {
  const s = state as any;
  const sel = selections as any;
  const runtime: string = sel.runtime;
  const platform: string = s.platform;

  const header = [
    "# bOpen Setup Plan",
    "",
    `Generated: ${s.generatedAt}`,
    `Target runtime: ${runtime}`,
    "",
    "This plan was produced by the bopen setup installer from user selections; execute top to bottom; every step lists its verification command.",
  ].join("\n");

  const sections: Array<{ title: string; lines: string[] | null }> = [
    { title: "Plugins", lines: buildPluginsSection(s, sel, runtime) },
    { title: "Agents", lines: buildAgentsSection(s, sel, runtime) },
    { title: "CLI dependencies", lines: buildCliSection(s, sel, platform) },
    { title: "Env keys", lines: buildEnvSection(s, sel) },
    { title: "Third-party skills", lines: buildThirdPartySkillsSection(s, sel) },
    { title: "Hooks", lines: buildHooksSection(s, sel) },
    { title: "Skill setup scripts", lines: buildSkillSetupScriptsSection(s, sel) },
  ];

  const footer =
    "Execute via Skill(bopen-tools:coordinator) where available; after executing, re-run the installer's Refresh to confirm state.";

  const parts = [header];
  for (const section of sections) {
    if (!section.lines || section.lines.length === 0) continue;
    parts.push(`## ${section.title}\n\n${section.lines.join("\n")}`);
  }
  parts.push(footer);

  return `${parts.join("\n\n")}\n`;
}
