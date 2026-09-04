// Pure setup-prompt emitter. It diffs PlanSelections against HarnessState and
// returns a complete, runtime-tailored prompt. It performs no I/O and never
// embeds detector detail strings, which may contain machine-specific paths.

import type {
  CheckState,
  HarnessState,
  PlanSelections,
  PluginState,
} from "./detector";
import { validatePackRuntime } from "./pack";
import { RUNTIMES, type Runtime } from "./runtimes";

const MARKETPLACE = "b-open-io";
const OPENCODE_SOURCE = '${XDG_DATA_HOME:-$HOME/.local/share}/bopen/opencode-source';
const OPENCODE_CONFIG = '${XDG_CONFIG_HOME:-$HOME/.config}/opencode';

function openCodeSource(): string {
  return `BOPEN_SOURCE="${OPENCODE_SOURCE}"`;
}

function openCodeBootstrap(): string {
  return [
    "set -e",
    openCodeSource(),
    'if [ ! -e "$BOPEN_SOURCE" ]; then',
    '  mkdir -p "$(dirname "$BOPEN_SOURCE")"',
    '  git clone https://github.com/b-open-io/prompts.git "$BOPEN_SOURCE"',
    "else",
    '  test -d "$BOPEN_SOURCE/.git"',
    '  test "$(git -C "$BOPEN_SOURCE" remote get-url origin)" = "https://github.com/b-open-io/prompts.git"',
    '  test -z "$(git -C "$BOPEN_SOURCE" status --porcelain)"',
    '  git -C "$BOPEN_SOURCE" fetch origin',
    '  git -C "$BOPEN_SOURCE" merge --ff-only origin/HEAD',
    "fi",
    'test -f "$BOPEN_SOURCE/opencode/install.ts"',
  ].join("\n");
}

function openCodeSelection(plugin: PluginState): boolean {
  return plugin.marketplace === MARKETPLACE && /^[a-z0-9][a-z0-9-]*$/.test(plugin.name);
}


function openCodeVerify(pluginName: string, present: boolean): string {
  const suffix = pluginName === "core" ? "" : `/modules/${pluginName}`;
  // The shim metadata is the installer's sole registry. Verify selection as
  // well as shim existence; debug inspection then checks runtime discovery.
  const script = [
    'const fs = require("node:fs");',
    'const [shim, root, expected] = process.argv.slice(1);',
    'let roots = [];',
    'if (fs.existsSync(shim)) {',
    'const line = fs.readFileSync(shim, "utf8").split("\\n")[0];',
    'if (!line.startsWith("// bopen-managed: ")) process.exit(1);',
    'const state = JSON.parse(line.slice("// bopen-managed: ".length));',
    'if (state.schema !== 1 || !Array.isArray(state.roots)) process.exit(1);',
    'roots = state.roots;',
    '}',
    'if (roots.includes(root) !== (expected === "yes")) process.exit(1);',
  ].join(" ");
  return [
    "set -e",
    openCodeSource(),
    `bun -e '${script}' "${OPENCODE_CONFIG}/plugins/bopen.ts" "$BOPEN_SOURCE${suffix}" ${present ? "yes" : "no"}`,
    "opencode debug config",
    "opencode debug skill",
  ].join("\n");
}

function findPlugin(state: HarnessState, name: string): PluginState | undefined {
  return state.plugins.find((plugin) => plugin.name === name);
}

function runtimeLabel(runtime: Runtime): string {
  return RUNTIMES.find((entry) => entry.id === runtime)?.label ?? runtime;
}

function fenced(command: string): string {
  return `\`\`\`sh\n${command}\n\`\`\``;
}

function action(title: string, command: string, verify: string, note?: string): string {
  return [
    `### ${title}`,
    note ?? null,
    "Command:",
    fenced(command),
    "Verify:",
    fenced(verify),
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n");
}

function portableCommand(command: string | undefined): string | null {
  if (!command) return null;
  const trimmed = command.trim();
  if (!trimmed) return null;
  if (/(^|\s)\/(Users|home)\/[^\s/]+\//.test(trimmed)) return null;
  return trimmed;
}

function portablePath(path: string | null | undefined, fallback: string): string {
  if (!path) return fallback;
  if (path === "~") return "$HOME";
  if (path.startsWith("~/")) return `$HOME/${path.slice(2)}`;
  if (path.startsWith("$HOME/")) return path;
  if (path.startsWith("/")) return fallback;
  return path;
}

function portableCheck(check: string | undefined, fallback: string): string {
  if (!check) return fallback;
  if (check.startsWith("env:")) {
    const key = check.slice(4);
    return `test -n "\${${key}:-}"`;
  }
  if (check.startsWith("path:")) {
    const rawPattern = check.slice(5);
    const pattern = portablePath(rawPattern, "");
    if (!pattern || /[\r\n;]/.test(pattern)) return fallback;
    return `set -- ${pattern}\ntest -e "$1"`;
  }
  return portableCommand(check) ?? fallback;
}

function pluginCacheRoot(runtime: Runtime, plugin: PluginState): string | null {
  if (!plugin.marketplace) return null;
  if (runtime === "codex") {
    return `$HOME/.codex/plugins/cache/${plugin.marketplace}/${plugin.name}`;
  }
  if (runtime === "claude" || runtime === "grok") {
    return `$HOME/.claude/plugins/cache/${plugin.marketplace}/${plugin.name}`;
  }
  return null;
}

function inPluginRoot(runtime: Runtime, plugin: PluginState, command: string): string | null {
  const portable = portableCommand(command);
  if (runtime === "opencode") {
    if (!openCodeSelection(plugin) || !portable) return null;
    const suffix = plugin.name === "core" ? "" : `/modules/${plugin.name}`;
    return [openCodeSource(), `cd "$BOPEN_SOURCE${suffix}"`, portable].join("\n");
  }
  const cacheRoot = pluginCacheRoot(runtime, plugin);
  if (!cacheRoot || !portable) return null;
  return [
    `CACHE_ROOT="${cacheRoot}"`,
    'PLUGIN_ROOT="$(find "$CACHE_ROOT" -mindepth 1 -maxdepth 1 -type d -print | sort | tail -n 1)"',
    'test -n "$PLUGIN_ROOT"',
    'cd "$PLUGIN_ROOT"',
    portable,
  ].join("\n");
}

function pluginVerify(runtime: Runtime, pluginName: string): string {
  if (runtime === "opencode") {
    return openCodeVerify(pluginName, true);
  }
  if (runtime === "claude") {
    return `claude plugin list | grep -F "${pluginName}"`;
  }
  if (runtime === "codex") {
    return `codex plugin list | grep -F "${pluginName}"`;
  }
  if (runtime === "grok") return "grok inspect";
  return `npx skills list | grep -F "${pluginName}"`;
}

function buildPluginsSection(
  state: HarnessState,
  selections: PlanSelections,
  runtime: Runtime,
): string[] {
  const blocks: string[] = [];
  let codexMarketplaceUpgradeEmitted = false;

  for (const selection of selections.plugins) {
    if (!selection.installPlugin) continue;
    const plugin = findPlugin(state, selection.name);
    if (!plugin) continue;

    if (runtime === "opencode") {
      if (!openCodeSelection(plugin)) {
        blocks.push(`### ${plugin.name}: native OpenCode delivery unavailable\n\nThis selection has no supported bOpen source adapter. Report it as not applicable; do not install a Claude plugin as a substitute.`);
        continue;
      }
      blocks.push(action(
        `${plugin.name}: install or update the native OpenCode plugin`,
        `${openCodeBootstrap()}\nbun "$BOPEN_SOURCE/opencode/install.ts" --plugin ${plugin.name} --global`,
        pluginVerify(runtime, plugin.name),
        `The adapter installs only the selected source plugin. If ${plugin.name} is not present in this repository, stop this item as unsupported. Inspect the emitted capability report and confirm its namespaced agents, commands, skills and supported MCP entries in the debug output; a Claude cache is not installation evidence. Restart OpenCode after installation.`,
      ));
      continue;
    }

    if (runtime === "claude") {
      const command = !plugin.marketplace
        ? null
        : plugin.installedClaude === null
          ? `claude plugin install ${plugin.name}@${plugin.marketplace}`
          : plugin.marketplaceVersion && plugin.marketplaceVersion !== plugin.installedClaude
            ? `claude plugin update ${plugin.name}@${plugin.marketplace}`
            : null;
      if (command) {
        blocks.push(
          action(
            `${plugin.name}: install or update the plugin`,
            command,
            pluginVerify(runtime, plugin.name),
            undefined,
          ),
        );
      }
      continue;
    }

    if (runtime === "codex") {
      const needsAction =
        plugin.installedCodex === null ||
        (plugin.marketplaceVersion !== null && plugin.marketplaceVersion !== plugin.installedCodex);
      if (!needsAction || !plugin.marketplace) continue;
      const commands: string[] = [];
      if (!codexMarketplaceUpgradeEmitted) {
        commands.push("codex plugin marketplace upgrade");
        codexMarketplaceUpgradeEmitted = true;
      }
      commands.push(`codex plugin add ${plugin.name}@${plugin.marketplace}`);
      blocks.push(
        action(
          `${plugin.name}: install or update the plugin`,
          commands.join("\n"),
          pluginVerify(runtime, plugin.name),
        ),
      );
      continue;
    }

    if (runtime === "grok") {
      if (plugin.installedClaude === null) {
        blocks.push(
          action(
            `${plugin.name}: install the Grok Build plugin`,
            `grok plugin install ${MARKETPLACE}/prompts --trust`,
            `grok plugin details ${plugin.name}\ngrok inspect`,
          ),
        );
      } else if (
        plugin.marketplace &&
        plugin.marketplaceVersion !== null &&
        plugin.marketplaceVersion !== plugin.installedClaude
      ) {
        blocks.push(
          action(
            `${plugin.name}: update the Claude-compatible plugin`,
            `claude plugin update ${plugin.name}@${plugin.marketplace}`,
            "grok inspect",
          ),
        );
      } else {
        blocks.push(
          action(
            `${plugin.name}: confirm compatibility discovery`,
            "grok inspect",
            "grok inspect",
            "The Claude Code installation is already the source used by Grok Build.",
          ),
        );
      }
      continue;
    }

    blocks.push(
      action(
        `${plugin.name}: add its portable skills`,
        `npx skills add https://github.com/${MARKETPLACE}/${plugin.name}`,
        pluginVerify(runtime, plugin.name),
        runtime === "hermes"
          ? "Hermes has no plugin mechanism; install the repository's skills into the user skill store when prompted."
          : "This runtime has no known plugin mechanism; install portable skills only.",
      ),
    );
  }

  return blocks;
}

/** Removals the user asked for. The plan runs the runtime's own uninstall
 * command and verifies the plugin is gone from that runtime's list, so a
 * cached leftover never passes as removed. */
function buildRemovalsSection(
  state: HarnessState,
  selections: PlanSelections,
  runtime: Runtime,
): string[] {
  const blocks: string[] = [];
  for (const selection of selections.plugins) {
    if (!selection.uninstallPlugin) continue;
    const plugin = findPlugin(state, selection.name);
    if (!plugin) continue;
    if (runtime === "opencode") {
      if (!openCodeSelection(plugin)) {
        blocks.push(`### ${plugin.name}: removal unavailable\n\nThis plugin has no supported bOpen OpenCode adapter. Inspect its actual installation mechanism before removing it.`);
        continue;
      }
      blocks.push(action(
        `${plugin.name}: remove the native OpenCode plugin`,
        `set -e\n${openCodeSource()}\ntest -f "$BOPEN_SOURCE/opencode/install.ts"\nbun "$BOPEN_SOURCE/opencode/install.ts" --plugin ${plugin.name} --global --uninstall`,
        openCodeVerify(plugin.name, false),
        `Confirm the adapter's managed ${plugin.name} source and its namespaced capabilities are absent. Other selected plugins and user configuration remain installed. Restart OpenCode after removal.`,
      ));
      continue;
    }
    if (runtime === "codex") {
      if (plugin.installedCodex === null) continue;
      blocks.push(
        action(
          `${plugin.name}: remove the Codex plugin`,
          `codex plugin remove ${plugin.name}`,
          `! codex plugin list | grep -F "${plugin.name}@" | grep -qE " installed, "`,
        ),
      );
      continue;
    }
    if (runtime === "claude" || runtime === "grok") {
      if (plugin.installedClaude === null) continue;
      if (!plugin.marketplace) {
        blocks.push(
          action(
            `${plugin.name}: remove the Claude Code plugin`,
            `claude plugin list`,
            `! claude plugin list | grep -qF "${plugin.name}@"`,
            "The marketplace this plugin came from is unknown. Read it from the list output, then run `claude plugin uninstall <name>@<marketplace>` and re-run the Verify block.",
          ),
        );
        continue;
      }
      blocks.push(
        action(
          `${plugin.name}: remove the Claude Code plugin`,
          `claude plugin uninstall ${plugin.name}@${plugin.marketplace}`,
          `! claude plugin list | grep -qF "${plugin.name}@"`,
          runtime === "claude" ? undefined : "This runtime consumes the Claude Code plugin installation; removing it there removes it here.",
        ),
      );
    }
  }
  return blocks;
}

function buildPackSection(state: HarnessState, runtime: Runtime): string[] {
  if (!state.pack || !validatePackRuntime(runtime)) return [];
  const pack = state.pack;
  return pack.dependencies.flatMap((dependency) => {
    const runtimeState = dependency.runtimes[runtime];
    if (runtimeState.installed) return [];
    const verify =
      dependency.marketplace === "portable-skill"
        ? `npx skills list | grep -F "${dependency.name}"`
        : runtime === "codex"
          ? `codex plugin list | grep -F "${dependency.name}"`
          : runtime === "grok"
            ? `grok inspect | grep -F "${dependency.name}"`
            : `claude plugin list | grep -F "${dependency.name}"`;
    return [
      action(
        `${dependency.name}: install the ${pack.name} dependency`,
        runtimeState.installCommand,
        verify,
        `Required by pack ${pack.packId}; marketplace ${dependency.marketplace}.`,
      ),
    ];
  });
}

function selectedChecks(
  state: HarnessState,
  selections: PlanSelections,
  kind: CheckState["kind"],
): Array<{ plugin: PluginState; check: CheckState }> {
  const selected: Array<{ plugin: PluginState; check: CheckState }> = [];
  for (const selection of selections.plugins) {
    const plugin = findPlugin(state, selection.name);
    if (!plugin) continue;
    for (const check of plugin.checks) {
      if (check.kind === kind && selection.checks.includes(check.id) && !check.installed) {
        selected.push({ plugin, check });
      }
    }
  }
  return selected;
}

function buildAgentsSection(
  state: HarnessState,
  selections: PlanSelections,
  runtime: Runtime,
): string[] {
  const blocks: string[] = [];
  for (const { plugin, check } of selectedChecks(state, selections, "codex-agents")) {
    if (runtime === "opencode") {
      blocks.push(`### ${plugin.name}: native agent delivery\n\nAgents require this plugin's native OpenCode adapter installation above; if it was not selected, inspect the existing installation first. Use \`opencode debug config\` to list its bopen-${plugin.name}- agent names, then run \`opencode debug agent <exact-name>\` for the agents you need. Missing agents are a failed delivery check, not a successful Claude cache discovery.`);
      continue;
    }
    if (runtime !== "codex") {
      blocks.push(
        `### ${plugin.name}: agent delivery\n\nNo command is required: ${
          runtime === "claude" || runtime === "grok"
            ? "agents are bundled with the compatible plugin installation."
            : "agent files are not deliverable on this runtime. Record this item as not applicable."
        }`,
      );
      continue;
    }

    const command = inPluginRoot(runtime, plugin, check.install ?? "");
    if (!command) continue;
    blocks.push(
      action(
        `${plugin.name}: deliver Codex agents`,
        command,
        portableCheck(check.checkCommand, 'test -d "$HOME/.codex/agents"'),
      ),
    );
  }
  return blocks;
}

function buildCliSection(state: HarnessState, selections: PlanSelections): string[] {
  const blocks: string[] = [];
  for (const { check } of selectedChecks(state, selections, "cli")) {
    const command = portableCommand(check.install);
    if (!command) continue;
    const usedBy = check.usedBy?.length ? ` Used by: ${check.usedBy.join(", ")}.` : "";
    const note = `${check.installNote ? `${check.installNote}. ` : ""}${usedBy}`.trim() || undefined;
    blocks.push(
      action(
        `${check.name}: install the CLI dependency`,
        command,
        portableCheck(check.checkCommand, `command -v ${check.name}`),
        note,
      ),
    );
  }
  return blocks;
}

function buildEnvSection(state: HarnessState, selections: PlanSelections): string[] {
  return selectedChecks(state, selections, "env").map(({ check }) =>
    action(
      `${check.name}: configure the environment key`,
      `export ${check.name}="<value supplied securely by the user>"`,
      `test -n "\${${check.name}:-}"`,
      `${check.obtain ? `Obtain the value from ${check.obtain}. ` : ""}Ask the user for the secret if it is unavailable; never print the value. After confirmation, persist it in the active shell's user profile.`,
    ),
  );
}

function buildThirdPartySkillsSection(
  state: HarnessState,
  selections: PlanSelections,
): string[] {
  const blocks: string[] = [];
  for (const { check } of selectedChecks(state, selections, "third-party-skill")) {
    const command = portableCommand(check.install);
    if (!command) continue;
    blocks.push(
      action(
        `${check.name}: install the third-party skill`,
        command,
        portableCheck(check.checkCommand, `npx skills list | grep -F "${check.name}"`),
      ),
    );
  }
  return blocks;
}

function buildHooksSection(state: HarnessState, selections: PlanSelections): string[] {
  const blocks: string[] = [];

  for (const selection of selections.plugins) {
    const plugin = findPlugin(state, selection.name);
    if (!plugin) continue;
    const desiredEntries = Object.entries(selection.hooks ?? {});
    if (desiredEntries.length === 0) continue;

    if (selections.runtime === "opencode") {
      const encoded = Buffer.from(JSON.stringify(Object.fromEntries(desiredEntries))).toString("base64");
      blocks.push(action(
        `${plugin.name}: apply the selected OpenCode hook states`,
        [
          "python3 - <<'PY'",
          "import base64, json",
          "from pathlib import Path",
          'path = Path(".opencode/bopen-hooks.json")',
          'if path.is_symlink(): raise ValueError("Refusing a symlinked hook config")',
          'current = json.loads(path.read_text()) if path.exists() else {}',
          'if not isinstance(current, dict): raise ValueError("Hook config must be an object")',
          'hooks = current.setdefault("hooks", {})',
          'if not isinstance(hooks, dict): raise ValueError("hooks must be an object")',
          `hooks.update(json.loads(base64.b64decode("${encoded}")))`,
          'path.parent.mkdir(parents=True, exist_ok=True)',
          'path.write_text(json.dumps(current, indent=2) + "\\n")',
          "PY",
        ].join("\n"),
        'python3 -m json.tool .opencode/bopen-hooks.json >/dev/null',
        "Run in the target OpenCode project. Hook configuration is ask-tier: confirm with the user before writing this file. Existing unrelated keys are preserved.",
      ));
      continue;
    }

    const currentByName = new Map(plugin.hooks.map((hook) => [hook.name, hook.enabled]));
    if (!desiredEntries.some(([name, desired]) => currentByName.get(name) !== desired)) continue;

    const target: Record<string, boolean> = {};
    for (const hook of plugin.hooks) target[hook.name] = hook.enabled;
    for (const [name, desired] of desiredEntries) target[name] = desired;

    const sortedTarget: Record<string, boolean> = {};
    for (const name of Object.keys(target).sort()) sortedTarget[name] = target[name];

    const path = portablePath(
      plugin.hooksConfigPath,
      `$HOME/.claude/${plugin.name}/hooks-config.json`,
    );
    const json = JSON.stringify(sortedTarget, null, 2);
    const command = [
      `HOOKS_PATH="${path}"`,
      'mkdir -p "$(dirname "$HOOKS_PATH")"',
      'cat > "$HOOKS_PATH" <<\'JSON\'',
      json,
      "JSON",
    ].join("\n");
    const verify = [
      `HOOKS_PATH="${path}"`,
      'test -s "$HOOKS_PATH"',
      'python3 -m json.tool "$HOOKS_PATH" >/dev/null',
    ].join("\n");

    blocks.push(
      action(
        `${plugin.name}: apply the selected hook states`,
        command,
        verify,
        "Hook configuration is ask-tier: confirm with the user before writing this file.",
      ),
    );
  }

  return blocks;
}

function buildSkillSetupScriptsSection(
  state: HarnessState,
  selections: PlanSelections,
  runtime: Runtime,
): string[] {
  const blocks: string[] = [];
  for (const { plugin, check } of selectedChecks(state, selections, "setup-script")) {
    const setupCommand = inPluginRoot(runtime, plugin, check.install ?? "");
    if (!setupCommand) {
      blocks.push(
        `### ${plugin.name}: ${check.name} setup\n\nThis runtime has no installed plugin root from which to run the setup script. Record this item as not applicable.`,
      );
      continue;
    }
    const markerName = `${plugin.name}-${check.name}`.replace(/[^A-Za-z0-9_-]/g, "_");
    const markerPath = `\${TMPDIR:-/tmp}/bopen-setup-${markerName}.ok`;
    const command = [
      "set -e",
      `SETUP_MARKER="${markerPath}"`,
      'rm -f "$SETUP_MARKER"',
      setupCommand,
      ': > "$SETUP_MARKER"',
    ].join("\n");
    const verify = [
      `SETUP_MARKER="${markerPath}"`,
      'test -f "$SETUP_MARKER"',
      'rm -f "$SETUP_MARKER"',
    ].join("\n");
    blocks.push(
      action(
        `${plugin.name}: run ${check.name} setup`,
        command,
        verify,
        "Treat a nonzero script exit as failure and report its diagnostics; follow any additional verification printed by the script.",
      ),
    );
  }
  return blocks;
}

function finalRuntimeVerification(runtime: Runtime): string {
  if (runtime === "claude") return "claude plugin list";
  if (runtime === "codex") return "codex plugin list";
  if (runtime === "grok") return "grok inspect";
  if (runtime === "opencode") return "opencode --version\nopencode debug config\nopencode debug skill";
  if (runtime === "hermes") return "hermes --version\nnpx skills list";
  return "npx skills list";
}

export function emitPlan(state: HarnessState, selections: PlanSelections): string {
  const runtime = selections.runtime;
  const sections: Array<{ title: string; blocks: string[] }> = [
    { title: "Pack dependencies", blocks: buildPackSection(state, runtime) },
    { title: "Plugins", blocks: buildPluginsSection(state, selections, runtime) },
    { title: "Plugin removals", blocks: buildRemovalsSection(state, selections, runtime) },
    { title: "Agents", blocks: buildAgentsSection(state, selections, runtime) },
    { title: "CLI dependencies", blocks: buildCliSection(state, selections) },
    { title: "Environment keys", blocks: buildEnvSection(state, selections) },
    {
      title: "Third-party skills",
      blocks: buildThirdPartySkillsSection(state, selections),
    },
    { title: "Hooks", blocks: buildHooksSection(state, selections) },
    {
      title: "Skill setup scripts",
      blocks: buildSkillSetupScriptsSection(state, selections, runtime),
    },
  ];

  const parts = [
    "# bOpen Setup Execution Prompt",
    "",
    "## Mission",
    "",
    `Bring the selected bOpen setup items into the requested state for ${runtimeLabel(runtime)} on ${state.platform}. Execute this prompt directly; no prior conversation, repository checkout, setup UI, or machine-specific project path is required.`,
    "",
    "## Execution rules",
    "",
    "1. Execute the sections in order and run every Verify block immediately after its Command block.",
    "2. Stop the affected item on any command or verification failure, preserve the error output, and continue only with independent items.",
    "3. Never print secret values. Ask the user when a credential or ask-tier hook write requires confirmation.",
    "4. Do not claim success from command exit alone; the corresponding Verify block must pass.",
  ];

  for (const section of sections) {
    if (section.blocks.length === 0) continue;
    parts.push("", `## ${section.title}`, "", section.blocks.join("\n\n"));
  }

  parts.push(
    "",
    "## Final verification and report",
    "",
    "Run the runtime-level inspection:",
    "",
    fenced(finalRuntimeVerification(runtime)),
    "",
    "Then report each requested item as passed, failed, or not applicable. Include the exact verification command used for each passed item and concise diagnostics for every failure. Do not include credential values.",
  );

  return `${parts.join("\n")}\n`;
}
