# Dual Claude Code and Codex plugin port

## Plugin agent boundary correction

- [x] Remove the app-specific `satchmo-live` deployment from plugin agent discovery.
- [x] Remove live-service routing and roster references from distributed plugin metadata.
- [x] Make the installable-persona versus app deployment boundary explicit.
- [x] Add Orbit's missing canonical agent title and regenerate Codex adapters.
- [x] Patch-bump both manifests, validate, commit, push, and smoke-test both installs.

### Review

- The plugin now has 30 source agents and 30 generated Codex adapters; all 30
  source agents have canonical `title` metadata.
- `satchmo-live` is absent from agent discovery, generated manifests, the
  company roster, the README, and front-desk routing.
- App-specific persistent agents and user-created deployments are documented
  as belonging to their owning projects rather than this plugin catalog.
- Released both manifests at `1.1.30` in commit `3953dbe`, updated both
  installed plugin caches, and verified the published artifact contains 30
  agents, no `satchmo-live`, and Orbit's `MCP Specialist` title.
- Fresh Claude and Codex sessions returned `CLAUDE_AGENT_BOUNDARY_OK` and
  `CODEX_AGENT_BOUNDARY_OK`; Codex SessionStart, UserPromptSubmit, and Stop
  hooks all completed.

- [x] Verify current Codex plugin, hook, and custom-agent contracts using
  official documentation and installed-runtime probes.
- [x] Design a shared prompt/include architecture that preserves the authored
  Claude agents while providing real Codex agent/orchestration support.
- [x] Get a read-only Fable advisor verdict on the architecture before broad
  edits.
- [x] Move Claude hooks to an explicit Claude-only configuration and fix bugs
  in the existing Claude behavior.
- [x] Implement Codex-native versions of useful hooks, including HammerTime,
  browser guidance, and session context where the runtime supports the spirit.
- [x] Add the Codex plugin manifest and repository marketplace metadata.
- [x] Make the coordinator/orchestrator and advisor patterns available in the
  installed Codex plugin, including Grok worker routing.
- [x] Validate Claude and Codex plugin behavior, install the published plugin into Codex,
  and smoke-test the installed toolkit from outside this repository.
- [x] Review the final diff, patch-bump both manifests, commit, push, update the
  Claude plugin, and verify `origin/master..master` is empty.

## Review

- Codex 0.144.0 supports real project and user custom agents. Plugin manifests
  do not install those agent files, so `agents/*.md` remains canonical and a
  deterministic generator plus explicit, ownership-aware installer provides
  regular TOML adapters without symlinks or hand-maintained prompt copies.
- A live isolated `gpt-5.6-sol` test installed the plugin and all 30 adapters,
  spawned `bopen_front_desk`, waited for it, and received
  `FRONT_DESK_AGENT_OK` from the child.
- Codex runtime agent identifiers require lowercase letters, digits, and
  underscores. The first live test caught hyphenated generated names; generator
  schema 2 now converts them and validates the runtime regex.
- Hook tests cover 113 cases across both runtimes. They include the existing
  Claude confirmation bug, nondestructive git unstaging, publish-gate GraphQL,
  Codex apply_patch protection, session context, browser guidance, and
  HammerTime continuation behavior.
- Released both manifests at `1.1.29`, pushed commit `65a8054`, updated the
  Claude plugin, installed the published Codex plugin and all 30 user-scope
  agents, and received `PUBLISHED_AGENT_OK` from `bopen_front_desk` in a fresh
  `gpt-5.6-sol` session. SessionStart, UserPromptSubmit, and Stop hooks all
  completed in that published-plugin smoke test.
