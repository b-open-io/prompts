# OpenCode native suite adapter

This is a native OpenCode plugin over the same source files used by our other
harnesses. It registers agents, slash commands, skill directories and compatible
MCP definitions through OpenCode's configuration hook, then bridges core's
reviewed shell/Python safeguards into native lifecycle hooks. There is no second
set of authored agents or skills to keep synchronized.

## Install

Requires OpenCode 1.18.20 or later, Bun (with `Bun.YAML`), and a persistent checkout.
Core hooks also require Python 3, bash, and jq. Run from the project you want to configure:

```sh
git clone https://github.com/b-open-io/prompts.git "$HOME/.local/share/bopen-opencode"
bun "$HOME/.local/share/bopen-opencode/opencode/install.ts" --all
```

Use `--plugin core --plugin orchestra` instead of `--all` to select modules.
Use `--global` to install for all projects, or `--project /path/to/project` for
an explicit project. `--dry-run` prints inventory and compatibility warnings
without changing files. An individual module page must select its module, never
silently expand to the entire suite.

Restart OpenCode, then inspect native discovery:

```sh
opencode debug config
opencode debug agent bopen-core-front-desk
opencode debug skill
```

Agents are named `bopen-<plugin>-<agent>`. Commands use
`/bopen-<plugin>-<command>`; nested paths join with hyphens. Skills retain their
original names and supporting files. Use OpenCode's `task` tool for delegation
and `skill` tool for progressive loading. Claude model aliases are not OpenCode
model IDs: agents inherit the current model. Explicit native user configuration
can override individual agent settings and disable a bundled MCP server.

## Update and uninstall

Keep the checkout at a stable path. Update it using a fast-forward pull, then
rerun the same install command and restart OpenCode. Never reset a checkout with
local changes. To remove selected modules, rerun with `--uninstall --plugin NAME`;
`--uninstall --all` removes the managed entrypoint. Use the same project/global
scope used for installation. The source checkout remains yours.

The installer owns only `plugins/bopen.ts` under the chosen OpenCode config
directory. It preserves existing JSON/JSONC configuration and other plugins;
modified or unowned entrypoints are rejected. Adding a module preserves existing
module selections. `opencode/manifest.json` is bOpen compatibility metadata for
the marketplace, not an OpenCode-standard plugin manifest.

## Compatibility limits

- Core bridges session context, prompt/roster routing, tool safeguards, skill
  activity and HammerTime. Arbitrary third-party hook registries and proprietary
  host apps need their own adapters; installation reports these gaps.
- Guard decisions that request additional confirmation block with an explanation.
  OpenCode 1.18.20 does not invoke the declared `permission.ask` plugin hook.
  Existing OpenCode permissions continue to apply; the bridge never grants them.
- HammerTime uses bounded follow-up turns in a persistent OpenCode session,
  rather than suppressing the previous answer. It excludes child, failed and
  cancelled turns, allows one content correction and caps automatic follow-ups.
  A headless `opencode run` client may return on the first idle event; do not rely
  on automatic continuation there. Ordinary guards and asset discovery still work.
- MCP credentials come from environment variables or explicit native configuration.
  Missing variables leave that server unregistered and produce a warning.
  Host OAuth setup remains an OpenCode connection step.
- Source tool names are translated in guidance; host-specific orchestration UI,
  model aliases and platform tools cannot be reproduced by changing a manifest.

## Verification

```sh
bun test opencode
bun opencode/install.ts --all --dry-run
```

The native API contract was inspected against OpenCode v1.18.20. See the
[plugin API](https://opencode.ai/docs/plugins/),
[agents](https://opencode.ai/docs/agents/) and
[MCP configuration](https://opencode.ai/docs/mcp-servers/).

Native 1.18.20 verification also exercised a real file-read tool against a
synthetic `.env` using a loopback fake model: the guard blocked before contents
reached the model. A persistent server test confirmed one HammerTime content
follow-up, then no further follow-ups after the repeated response. No paid model
requests were used. Lifecycle unit tests additionally cover errors, cancellation,
deduplication and the continuation cap.
