# Grok Persona-Passing

**Why:** Codex gets personas automatically — installed `bopen_*` agents are
generated adapters carrying the persona body. Grok has no such adapter; a Grok
dispatch is persona-less unless the prompt file supplies one.
`scripts/grok-persona.sh` closes that gap by prefixing the task with an
agent's system-prompt body (frontmatter stripped).

## Preflight the model and auth lane

Follow [the Grok worker guide](workers/grok.md). It distinguishes the saved
grok.com login from `XAI_API_KEY` billing and requires the preflight and worker
command to use the same lane. Pin the verified model ID; do not inherit a
changing CLI default.

## Usage with the Grok worker wrapper

Write the persona-prefixed prompt to a file, then dispatch it through
`run-grok-worker.sh` like any other Grok-CLI worker, so the model, casing,
credit, auth, and sandbox checks still apply. Never pass the persona file to a
raw `grok` command.

Code-writing lane (agent edits the repo in an explicitly isolated worktree):

```bash
PROMPT_FILE=$(mktemp -t grok-prompt.XXXXXX)
bash scripts/grok-persona.sh code-auditor "$(cat SPEC-x.md)" > "$PROMPT_FILE"
bash /absolute/path/to/coordinator/scripts/run-grok-worker.sh \
  --auth grok.com --model "$WORKER_MODEL" --mode write \
  --cwd <worktree> --branch <branch> --base-ref <ref> --ownership '<owned paths>' \
  --prompt-file "$PROMPT_FILE" --log "$PROMPT_FILE.log"
```

Read-only lane (research and summaries — no edits). The wrapper uses plan
permission mode and keeps the workspace sandbox. Keep the task and allowed
repository scope narrow so headless operation does not stall on unrelated
approvals:

```bash
PROMPT_FILE=$(mktemp -t grok-prompt.XXXXXX)
bash scripts/grok-persona.sh researcher "Summarize this README:
$(head -60 README.md)" > "$PROMPT_FILE"
bash /absolute/path/to/coordinator/scripts/run-grok-worker.sh \
  --auth grok.com --model "$WORKER_MODEL" --mode read \
  --cwd "$(pwd)" --prompt-file "$PROMPT_FILE" --log "$PROMPT_FILE.log"
```

Review lane (read-only). Review never inherits `$WORKER_MODEL` or the runtime
default effort: it runs on a quoted `gpt-6-sol` entry with `--effort xhigh`.
Usage-credit pressure never moves a review to Grok; narrow its scope or queue it.

```bash
PROMPT_FILE=$(mktemp -t grok-prompt.XXXXXX)
bash scripts/grok-persona.sh code-auditor "$(cat REVIEW-x.md)" > "$PROMPT_FILE"
bash /absolute/path/to/coordinator/scripts/run-grok-worker.sh \
  --auth grok.com --model gpt-6-sol --effort xhigh --mode read \
  --cwd "$(pwd)" --prompt-file "$PROMPT_FILE" --log "$PROMPT_FILE.log"
```

Persona activation shows up in the output shape: a `researcher` dispatch
returns Parker's template (a "What matters" block, Scope/Sources/Deliverable,
Sources with access dates) rather than a generic answer.

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
