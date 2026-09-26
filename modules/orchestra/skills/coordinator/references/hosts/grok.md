# Grok Build Host

Read this only when Grok Build is the current main session.

## Native agents

A Grok main session stays the main seat, but that does not make Grok the worker
default. Route implementation to `claude-opus-5-5` through the Claude Code CLI
and code review to `gpt-6-sol` at `xhigh` through
`run-grok-worker.sh --model gpt-6-sol` or the Codex CLI. Dispatch
native Grok roster agents or Grok workers only under explicit usage-credit
pressure (`BOPEN_USAGE_CREDIT_PRESSURE=1` or the user saying so), and then only
on `grok-4.7`. Never dispatch Grok 4.6. Pass the named agent type; installed
bOpen aliases may also resolve. Native agent model fields accept Grok-native
slugs, not arbitrary custom model ids.

## Native workflows

Grok's workflow engine uses Rhai. It provides agent, parallel, phase, log, and
complete primitives. Parallel is a barrier; there is no Claude-style pipeline.
Read the live tool description for current parameters.

Author workflows with Grok's bundled create-workflow skill at
~/.grok/bundled/skills/create-workflow/SKILL.md. It is host-owned and is not
part of Orchestra. Save project workflows under .grok/workflows/ and smoke
check with representative validation arguments before a real run. Worktree
isolation does not merge results; the main reviews and integrates them.

Custom ids shown by `grok models` work through the Grok CLI, but not as native
workflow agent model values. To use a GPT-6 Sol reviewer inside a Grok workflow, wrap a
`run-grok-worker.sh --model gpt-6-sol` call in a thin supervisor after
confirming the quoted model entry; never a raw `grok --single` dispatch. The supervisor only relays; it does not implement. An unquoted
dotted TOML key creates the wrong nested id.

## External workers

Wrap each selected external worker in a native Grok agent so it is visible to
the host and can participate in a workflow. The native controller supervises
the CLI lane and must not implement the ticket itself. Direct shell dispatch
from the main is only the fallback when native agent dispatch is unavailable.

Load only the chosen guide:

- [Codex, Sol, or Astra](../workers/codex.md)
- [Muse Code](../workers/muse.md)
- [OpenCode CLI](../workers/opencode.md)

If a custom Sol id is absent from Grok, use the Codex CLI guide instead. The
default advisor is `claude-opus-5-5`, not a native Grok model slug.
