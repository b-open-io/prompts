# Grok Persona-Passing

**Why:** Codex gets personas automatically — installed `bopen_*` agents are
generated adapters carrying the persona body. Grok has no such adapter; a raw
`grok --prompt-file` dispatch is persona-less unless the prompt supplies one.
`scripts/grok-persona.sh` closes that gap by prefixing the task with an
agent's system-prompt body (frontmatter stripped).

## Usage with the grok dispatch shape

```bash
PROMPT_FILE=$(mktemp -t grok-prompt.XXXXXX)
bash scripts/grok-persona.sh code-auditor "$(cat SPEC-x.md)" > "$PROMPT_FILE"
grok --prompt-file "$PROMPT_FILE" -m "$WORKER_MODEL" --permission-mode acceptEdits \
  --sandbox workspace --output-format plain --cwd <repo>
```

Agent name may omit `.md`. Task text is `$2`, or piped/heredoc'd stdin when
`$2` is absent. A missing agent name exits 1 with the list of available
agents under `agents/`.

## Boundary note

The emitted persona body is plugin content (an `agents/*.md` file already
shipped in this repo) — safe to send to an external vendor lane. This does
NOT extend to the task text appended after it: apply the coordinator's
external-lane disclosure and content rules there. Never let the task text
carry credentials, secrets, or unrelated repository content — the persona
prefix does not change what's safe to include in the SPEC or task string
that follows it.
