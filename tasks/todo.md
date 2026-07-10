# Dual Claude Code and Codex plugin port

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
