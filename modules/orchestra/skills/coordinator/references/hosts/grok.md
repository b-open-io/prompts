# Grok Build Host

Read this only when Grok Build is the current main session.

## Native agents

Prefer roster agents on grok-4.6. Pass the named agent type; installed bOpen
aliases may also resolve. Do not dispatch grok-4.5. Native agent model fields
accept Grok-native slugs, not arbitrary custom model ids.

## Native workflows

Grok's workflow engine uses Rhai. It provides agent, parallel, phase, log, and
complete primitives. Parallel is a barrier; there is no Claude-style pipeline.
Read the live tool description for current parameters.

Author workflows with Grok's bundled create-workflow skill at
~/.grok/bundled/skills/create-workflow/SKILL.md. It is host-owned and is not
part of Orchestra. Save project workflows under .grok/workflows/ and smoke
check with representative validation arguments before a real run. Worktree
isolation does not merge results; the main reviews and integrates them.

Custom ids shown by grok models work with grok --single, but not as native
workflow agent model values. To use GPT-5.6 Sol inside a Grok workflow, wrap
grok --single -m gpt-5.6-sol in a grok-4.6 supervisor after confirming the
quoted model entry. An unquoted dotted TOML key creates the wrong nested id.

## External workers

Load only the chosen guide:

- [Codex, Sol, or Luna](../workers/codex.md)
- [Muse Code](../workers/muse.md)
- [OpenCode CLI](../workers/opencode.md)

If a custom Sol id is absent from Grok, use the Codex CLI guide instead. Fable
is an Advisor channel, not a native Grok model slug.
