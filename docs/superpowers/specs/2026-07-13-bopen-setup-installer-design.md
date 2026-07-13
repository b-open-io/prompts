# bOpen Unified Setup Installer (OPL-2850)

Approved design, 2026-07-13. Implementation dispatched via the coordinator
skill after user review of this spec.

## Goal

One installer that shows the true state of a user's agent harness — plugins,
skills, CLI dependencies, env keys, agents, hooks — across every bOpen plugin,
and emits a runtime-tailored instruction plan the parent agent executes. The
installer itself never installs, writes config, or mutates anything.

## Non-goals

- Executing installs from the UI (the parent agent does that, ideally via the
  coordinator skill).
- Replacing existing per-plugin setup mechanisms (it fronts them; see
  Integration Table).
- Recording install state anywhere (see Drift).

## Core contract

```
declare (manifests, git-versioned)  →  detect (live, every load/refresh)  →  select (UI)  →  emit (plan prompt)
```

## 1. setup/manifest.json — one per plugin, declarative only

```jsonc
{
  "plugin": "bopen-tools",
  "clis": [
    {
      "name": "agent-browser",
      "usedBy": ["agent-browser", "chrome-cdp", "webapp-testing"],
      "check": "agent-browser --version",
      "install": { "any": "npm install -g agent-browser && agent-browser install" }
    },
    {
      "name": "ffmpeg",
      "usedBy": ["ui-audio-theme"],
      "check": "ffmpeg -version",
      "install": { "darwin": "brew install ffmpeg", "linux": "apt install ffmpeg" }
    }
  ],
  "env": [
    { "key": "ELEVENLABS_API_KEY", "usedBy": ["ui-audio-theme", "voice-clone"],
      "obtain": "https://elevenlabs.io → Profile → API Keys" }
  ],
  "thirdPartySkills": [
    { "name": "vercel-react-best-practices", "source": "vercel-labs/agent-skills",
      "check": "path:~/.claude/skills/vercel-react-best-practices",
      "install": "npx skills add https://github.com/vercel-labs/agent-skills --skill react-best-practices" }
  ],
  "agents": {
    "claude": "bundled",
    "codex": { "script": "skills/codex-agent-setup/scripts/setup.sh",
               "check": "path:~/.codex/agents" }
  },
  "hooks": { "manifest": "hooks/manifest.json",
             "config": "~/.claude/bopen-tools/hooks-config.json" },
  "skillSetupScripts": [
    { "skill": "x-tweet-search", "script": "skills/x-tweet-search/scripts/setup.sh",
      "purpose": "X API bearer token" }
  ]
}
```

`check` forms: a shell command (exit 0 = installed), `path:<glob>` (exists =
installed), or `env:<KEY>` (set = configured). Manifests carry **no state**.

## 2. Drift — resolved by construction

Install state is never persisted. The detector recomputes every check on page
load and on the Refresh button (a `/api/state` endpoint re-runs all checks,
~1-2s). The manifest is a versioned declaration shipped inside the installed
plugin, so it updates exactly when the plugin updates. The only cached data is
the marketplace catalog fetch (session-lifetime, with a visible "fetched N
minutes ago" stamp and its own refresh).

## 3. Detector

Ships as part of the installer (Bun single-file server, sound-picker pattern,
binds 127.0.0.1). Read-only shell-outs:

- **Runtime**: launching agent passes `--runtime <name>`; detector cross-checks
  signals (env `CLAUDECODE`, Codex session markers, etc. — matrix below) and
  flags mismatches rather than guessing silently.
- **Plugins installed**: `claude plugin list` / `codex plugin list` + plugin
  cache directories; versions compared against marketplace catalog
  (`https://bopen.ai/api/marketplace`; offline → marketplace column shows
  "unavailable", local detection still works — fail informative, no fake data).
- **Per-manifest checks**: CLIs via their `check` commands, env via presence
  only (values never read into the UI), third-party skills via path checks +
  `skills-lock.json`, codex agents via their `check`.
- **Hooks**: read `hooks/manifest.json` (catalog) + `hooks-config.json`
  (current enable/disable state).

## 4. UI

bOpen theme (dark maroon `#2b120a`, steel blue, amber, mono type, sharp
corners — same tokens as bopen.ai). Layout:

- **Overview tab**: runtime badge, harness summary (plugins installed/total,
  missing CLIs, unset env keys, hooks on/off counts), one-line status per
  plugin.
- **One tab per plugin** (installed or not): sections for Plugin (install
  state + version vs marketplace), Agents (per-runtime delivery state), CLI
  dependencies, Env keys, Third-party skills, Hooks (toggle list seeded from
  current config), Skill setup scripts. Every item: state checkbox
  (pre-checked = detected present), **copy button with the exact install
  command**, and the `usedBy` skills so users know what breaks without it.
- **Global controls**: Refresh (re-detect), runtime selector (defaults to
  detected), "Build setup plan".
- Marketplace plugins not installed appear as tabs in a dimmed state with the
  install command.

## 5. Output: the setup plan

"Build setup plan" diffs selections against detected state and renders a
markdown instruction prompt, grouped and ordered (plugins → agents → CLIs →
env → third-party skills → hooks config → skill setup scripts), with commands
in the active runtime's dialect. Hooks changes emit the target
`hooks-config.json` content with a note that hook config is ask-tier — the
executing agent must confirm with the user before writing. The plan is
displayed with a copy button and written to
`<output-dir>/bopen-setup-plan.md`. Nothing is executed by the installer.

## 6. Integration table — no redundant paths

| Existing path | Role under the installer |
|---|---|
| `codex-agent-setup` skill + `scripts/setup.sh` (per plugin) | Plan invokes these scripts verbatim for Codex agent installs; installer never reimplements agent copying |
| hook-manager skill + `hooks-config.json` + `[BOPEN-HOOKS-SETUP]` | Installer reads/writes-nothing; hooks tab reflects config, plan emits config content; hook-manager remains the conversational path. `[BOPEN-HOOKS-SETUP]` directive copy gains a pointer to `/bopen-setup` as the visual alternative |
| Per-skill `setup.sh` (x-*, persona, npm-publish token, statusline) | Listed in manifests as `skillSetupScripts`; plan tells the agent when to run them |
| `gemskills:setup`, `sigma-auth:setup`, `codex:setup` skills | Referenced from their plugins' manifests as the canonical setup step; plan says "invoke Skill(gemskills:setup)" rather than duplicating their logic |
| `npx skills add` / `claude plugin` / `codex plugin` CLIs | The plan's command vocabulary; installer shells out to the `list` forms only |

## 7. Runtime matrix

| Runtime | Status | Plugin/skill mechanism | Agent delivery | Detection |
|---|---|---|---|---|
| Claude Code | v1 | `claude plugin install x@marketplace` | bundled with plugin | `CLAUDECODE` env |
| Codex CLI | v1 | `codex plugin add` + marketplace | `codex-agent-setup` scripts | codex session env/paths |
| OpenCode | pending research | reads `.claude/skills`, parses CC agent files | native parse | TBD |
| Pi | pending research | TBD | TBD | TBD |
| Hermes | pending research | TBD | TBD | TBD |
| Grok/GrokBuild | pending research | TBD | TBD | TBD |

A background research pass (in flight) fills this table before implementation;
runtimes that lack a real skill mechanism ship as "generic" (plan emits
portable `npx skills add` instructions only).

## 8. v1 scope

- Manifest schema + `setup/manifest.json` for bopen-tools (other plugins:
  follow-up one-file PRs; installer shows manifest-less plugins with install
  state only).
- Installer skill `bopen-tools:setup` (command `/bopen-setup`): Bun server,
  detector, UI, plan emitter.
- Runtimes: claude + codex full support; others per research outcome, minimum
  "generic" tier.
- Tests: detector check-parsing unit tests, manifest schema validation, plan
  emitter snapshot tests per runtime.

## 9. Verification

Unit tests (bun test) for check evaluation and plan emission; manual pass:
launch in this harness, confirm detected state matches reality (spot-check 5
known-installed + 2 known-missing deps), toggle a hook + build plan, execute
the plan in a scratch session, Refresh shows the new state without restart.
