---
name: codex-agent-setup
description: >
  Explicit-only installer for bopen-tools Codex custom agents. Use ONLY when the
  user explicitly asks to install, update, check, uninstall, or set up Codex
  agents / custom agents from this plugin — phrases include "install codex
  agents", "setup codex agents", "update codex agents", "check codex agents",
  "install all codex agents", "uninstall codex agents", "project codex agents",
  "user codex agents", or "install bopen agents into .codex". Never auto-invoke.
  Never silently modify global Codex configuration.
disable-model-invocation: true
user-invocable: true
metadata:
  author: b-open-io
  version: "1.0.3"
  codex:
    disable-model-invocation: true
    explicit_invocation_only: true
    never_modify_global_config: true
  version_note: "1.0.3 adds the Verify section and documents subagent invocation"
---

# Codex Agent Setup

Installs the plugin's generated Codex custom-agent adapters as **regular files**
into a Codex agents directory. Explicit invocation only — do not run unless the
user asked to install, update, check, or uninstall these agents.

## Safety rules (non-negotiable)

- **Never** edit `~/.codex/config.toml` or any global Codex config.
- **Never** symlink into the plugin cache; the installer copies regular files.
- **Never** delete unrelated user/project agents.
- Default scope is the **current project** (`.codex/agents/`), not user-global.
- Prefer `--check` first when the user asks what would change.

## Commands

Run via the bundled launcher (resolves checkout **or** installed plugin cache):

```bash
bash "${SKILL_DIR}/scripts/setup.sh" [options]
```

If `SKILL_DIR` is unknown, resolve from this skill's path or set
`BOPEN_PLUGIN_ROOT` to the plugin root and run:

```bash
python3 "${BOPEN_PLUGIN_ROOT}/scripts/codex-agents/install.py" [options]
```

### Common invocations

| User intent | Command |
|---|---|
| Install curated roster into **project** `.codex/agents/` | `bash scripts/setup.sh` |
| Install curated roster into **user** `${CODEX_HOME:-~/.codex}/agents/` | `bash scripts/setup.sh --user` |
| Install **all** generated agents (project) | `bash scripts/setup.sh --all` |
| Install all into user scope | `bash scripts/setup.sh --user --all` |
| Dry-run / drift check | `bash scripts/setup.sh --check` (add `--user` / `--all` as needed) |
| Uninstall managed agents | `bash scripts/setup.sh --uninstall` (add `--user` if installed user-scope) |
| Overwrite an unmanaged name collision | `bash scripts/setup.sh --force` |

### Default curated roster

`front-desk`, `agent-builder`, `prompt-engineer`, `researcher`, `tester`,
`documentation-writer`, `architecture-reviewer`, `code-auditor`.

Each file installs as `bopen-<name>.toml` (for example
`bopen-front-desk.toml`). Its Codex runtime agent name uses the identifier-safe
`bopen_<name_with_underscores>` form, such as `bopen_front_desk`.

### Full roster

`--all` installs every generated adapter under `codex/agents/`. Only
installable plugin personas live in `agents/`; app-specific deployments and
user-created agents are not source inputs for this installer.

## What the installer does

1. Reads committed generated adapters from `<plugin-root>/codex/agents/`.
2. Copies selected TOML files **atomically** into the target agents directory.
3. Maintains an ownership manifest: `.bopen-tools-agents.json` in the target.
4. Preserves unrelated agents always.
5. Refuses unmanaged filename collisions unless `--force`. With `--force`,
   quarantines the colliding unmanaged file first; if quarantine fails, aborts
   that file without overwriting.
6. Quarantines only **stale** unmodified managed files — those whose source
   adapter no longer exists in the full current plugin roster. A later curated
   install after `--all` does **not** drop still-valid non-curated agents.
7. Stores quarantined files under a target-local hidden directory:
   `<target>/.bopen-tools-trash/quarantine/...` (nested non-TOML path so Codex
   agent discovery never loads them). No temp-directory fallback.
8. Leaves **modified** managed files in place and prints a warning.
9. Prints installed / updated / quarantined / skipped counts.
10. Reminds the user that a **new Codex session** is required to load agents.

## How Codex invokes an installed agent

Codex has **no `codex exec --agent` flag**. Installed adapters are **subagents**:
the Codex orchestrator spawns them by name when the `multi_agent` feature is on
(a `thread_spawn` under the hood). The runtime name is the identifier-safe form
(`bopen_researcher`, `bopen_front_desk`), not the `bopen-<name>.toml` filename.

`multi_agent` is a Codex feature flag. It is often already enabled globally under
`[features]` in `~/.codex/config.toml`; if not, enable it **per invocation** with
`-c 'features.multi_agent=true'` rather than editing global config (safety rule).

To use an agent, name it in the prompt and tell the orchestrator to delegate:

```bash
codex exec -c 'features.multi_agent=true' \
  "Delegate this to the bopen_researcher subagent and return its answer verbatim: <your task>"
```

## Verify (one-shot, after install)

Prove an installed adapter's persona is actually active. Run from a **new**
Codex session (agents are read at session start):

```bash
codex exec --sandbox read-only --skip-git-repo-check \
  -c 'features.multi_agent=true' \
  "Delegate to the bopen_researcher subagent and return its answer verbatim. \
Task: State your role, operating constraints, your Pre-Task Contract fields, \
and which agents you delegate code analysis and architecture review to. \
Do not answer yourself — spawn the bopen_researcher agent."
```

**Pass criteria** — the returned answer carries the source persona
(`agents/researcher.md`), not a generic assistant. For `bopen_researcher` expect:
identifies as **Parker / Research Analyst**, states it is **read-only**, lists the
**Pre-Task Contract** fields (Scope / Sources / Deliverable), and delegates code
analysis to **code-auditor** and architecture review to **architecture-reviewer**.
If the reply is generic or ignores those constraints, the agent was not spawned —
confirm you started a new session and that the adapter exists in the target
agents dir.

Swap `bopen_researcher` and the pass criteria for whichever agent you installed.

## Maintainer: regenerate adapters

When `agents/*.md` changes, regenerate committed artifacts from the plugin root:

```bash
python3 scripts/codex-agents/generate.py
python3 scripts/codex-agents/generate.py --check
```

Or: `bash skills/codex-agent-setup/scripts/generate.sh`.

## After install

Tell the user:

1. Summary counts from the installer output.
2. Target directory used (project vs user).
3. They must **start a new Codex session** before spawning `bopen_*` agents.
4. Global Codex config was **not** modified.
5. How to invoke: agents are Codex **subagents** spawned by name
   (`bopen_researcher`, not the `.toml` filename) when `multi_agent` is on — see
   "How Codex invokes an installed agent" above.
6. Offer to run the **Verify** one-shot to prove the persona is active.
