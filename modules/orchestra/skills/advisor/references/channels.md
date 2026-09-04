# Advisor channels

Read only the section for the selected channel. Detect availability; never
assume a binary, subscription, provider block, or model id exists.

## Selection

| Need | Prefer |
|---|---|
| Repository-aware OpenAI opinion | read-only Codex process or plugin consult |
| Transcript-only Claude opinion | configured native Claude advisor |
| Repository-aware Claude opinion | read-only premium Claude child |
| Claude-native review from a Codex main | Fable CLI |
| In-harness or alternate-provider OpenCode opinion | read-only OpenCode agent |

Ask once when multiple materially different providers are available and the
user has not chosen. External channels cross a provider boundary: disclose the
destination and selected context before first use.

## Native Claude advisor

Use only when `advisorModel` is configured or the session exposes the advisor
tool. It sees the transcript but cannot inspect files. Put the relevant
evidence in the conversation before consulting. Usage is metered at the
advisor model's rate.

## Premium Claude child

Use a read-only child with only repository-inspection tools. Pin the intended
stronger model and require its model identity on the first line. An unavailable
pin may silently inherit the session model; that is not an independent consult.

## Fable from Codex

Preflight `claude --version`, `claude auth status`, the selected model-family
alias, and `~/.claude/communication.md`. Put the complete consult in a file and
feed it over stdin:

```bash
env -u ANTHROPIC_API_KEY claude \
  --print \
  --safe-mode \
  --append-system-prompt-file "$HOME/.claude/communication.md" \
  --model "${BOPEN_ADVISOR_MODEL:-fable}" \
  --effort high \
  --permission-mode plan \
  --tools "Read,Grep,Glob" \
  --no-session-persistence \
  < /absolute/path/to/consult.md
```

This prefers the signed-in Claude Code account by removing an ambient API key.
If the user requests API billing, disclose that change. Missing authentication,
communication policy, or model availability makes the lane unavailable.

## Codex

Use a read-only `codex exec` consult or a plugin request explicitly framed as
advisory and no-edit. Codex can inspect the repository. A resumable plugin
thread is useful for a related follow-up; otherwise prefer a fresh context.
Always demand the structured advice contract from the entry skill.

## OpenCode

OpenCode is the harness, not the provider. Inspect `opencode.json`, list the
selected provider's models, and pin the complete `provider/model` id. Configure
a named agent whose permissions deny edits and shell execution.

`--agent` selects primary/all-mode agents. Invoke a `mode: subagent` advisor by
mentioning it from a primary session and verify its child marker:

```bash
opencode run --model "<provider>/<model>" --dir <repo> \
  "@<read-only-subagent> Review the attached consult and return the required verdict."
```

Use `-f/--file` for evidence, `--format json` for scripted results, or
`--attach` to reuse a running server. There is no `opencode exec`. A primary
run without the expected child marker does not prove the advisor ran.

## Failure behavior

Unavailable authentication, model, or permission controls make a channel
unavailable. Do not silently replace its provider or absorb the consult into
the main model. Preserve the question and ask the user to authorize another
channel when independent advice still matters.
