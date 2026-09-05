---
name: runtime-context
description: >-
  Use when the user asks what runtime or host is active, which capabilities are
  available, or how behavior should adapt across Claude Code, Codex, Grok,
  OpenCode, a sandbox, or local development. Reports observed capabilities
  without inferring tools from host identity.
user-invocable: false
---

# Runtime Context

Host identity and available capabilities are separate facts. Use the host value
to choose a compatible workflow, and use the observed capability fields to
choose tools. Never claim a tool exists because an environment variable names
a host.

## Host detection

Run the detector from the plugin root:

```bash
bash skills/runtime-context/scripts/detect.sh
```

The detector reports `claude-code`, `codex`, `grok`, `opencode`, `sandbox`,
`local`, or `unknown`. An explicit `BOPEN_HOST_HARNESS` marker is authoritative;
without it, the Vercel sandbox marker selects `sandbox`, trusted Claude or
Codex session markers identify those hosts, and the fallback is `unknown`.
Installed CLIs and directories are reported as capabilities and do not identify
the host. An explicit `local` marker is available when a local lane is known.

The JSON keeps `has_bash`, `has_bun`, `has_node`, `has_skills`, `skills_count`,
`sandbox_id`, `working_dir`, and runtime version fields for existing callers.
The `capabilities` object lists observed command and skill-directory access.
The detector cannot see tools exposed by the parent agent, so it does not
fabricate a `has_skill_tool` field.

## Working across hosts

Use the file, browser, shell, and visualization tools exposed in the current
session. If a needed tool is unavailable, say which capability is missing and
adapt using the tools that are actually available. Load a skill directly from
its `SKILL.md` only when the current host does not expose a skill loader.

BitPlan is optional. Use it when it is available and useful for the requested
visual plan; the current tool availability remains authoritative.

Do not announce the environment at the start of every task. Report it when the
user asks, when a capability changes the plan, or when a failed tool call needs
an explanation.
