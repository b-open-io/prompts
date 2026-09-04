# Grok CLI Worker

Read this only when the Grok Build CLI is the selected external worker. A
dispatch can send the prompt, spec, and selected repository content to xAI;
apply the Coordinator disclosure rule before first use.

## Choose and verify the auth lane

Grok Build can use ambient `XAI_API_KEY` / `GROK_API_KEY` credentials or the
account signed in through `grok.com`. Choose deliberately; do not call either
one "the subscription" without evidence. An ambient API credential can take
precedence over the saved grok.com login.

- For the user's signed-in grok.com account, run
  `env -u XAI_API_KEY -u GROK_API_KEY grok models` and require `You are logged
  in with grok.com.` Prefix every worker command with the same two-variable
  removal. This selects the account's Grok entitlement; it does not by itself
  prove a particular paid plan or billing term.
- For xAI API-key billing, run `grok models` with the intended key available
  and require `You are using XAI_API_KEY`.

If the requested account lane is not authenticated, stop. Run
`grok login --oauth` or `grok login --device-auth` only when the user has
authorized sign-in. Never print, persist, or place a credential in a prompt or
log.

Capture the complete preflight output, then pin `BOPEN_WORKER_MODEL` to an
exact listed id; never ride a changing CLI default. If authentication, model
availability, or network access cannot be verified, report the lane as
unavailable rather than silently implementing in the main.

### Clean subscription process

Follow the shared capability-inheritance policy. When unrelated plugins or MCP
servers would widen the data boundary or stall a headless run, use a temporary
Grok home. Link the existing managed credential; never copy it into a prompt,
repository, or log:

```bash
CLEAN_GROK_HOME=$(mktemp -d -t grok-worker.XXXXXX)
ln -s "$HOME/.grok/auth.json" "$CLEAN_GROK_HOME/auth.json"
env -u XAI_API_KEY -u GROK_API_KEY GROK_HOME="$CLEAN_GROK_HOME" grok models
env -u XAI_API_KEY -u GROK_API_KEY GROK_HOME="$CLEAN_GROK_HOME" \
  grok --sandbox workspace inspect --json
```

Inspect a redacted capability summary before dispatch; never retain or paste a
raw debug trace or raw capability dump because managed connector definitions
can contain credentials. A grok.com workspace can still supply
managed configuration after sign-in, so a clean local directory does not prove
that no managed plugin or MCP server loaded. If unrelated integrations remain,
disable their exact discovered plugin IDs in the temporary `config.toml` when
policy permits. If managed policy forces them, report that boundary and stop or
continue only with the user's approval. Do not alter the user's normal Grok
configuration for one worker run.

Grok Build 1.0.13 has also been observed creating internal research children
in plan mode despite `--no-subagents`. Treat the flag as intent, not proof.
Report child markers that appear in the normal full worker log. If that log
does not expose child lifecycle evidence, report it as `unknown`; do not enable
or retain a raw debug trace just to answer the question. For focused web
research, restrict the process to `web_search,web_fetch` when those are the only
required tools; a clean home is not a substitute for a narrow tool set.

## Dispatch

Prefer the deterministic wrapper at `scripts/run-grok-worker.sh`, resolved
from the coordinator skill directory. It keeps authentication, model pinning,
capability inventory, sandboxing, turn bounds, and evidence logs consistent:
Its inspection log is redacted and written with owner-only permissions.

```bash
bash /absolute/path/to/coordinator/scripts/run-grok-worker.sh \
  --auth grok.com \
  --model grok-4.6 \
  --mode write \
  --cwd /absolute/path/to/worktree \
  --branch codex/example-task \
  --base-ref origin/dev \
  --ownership 'src/feature/** and tests/feature/**' \
  --prompt-file /absolute/path/to/spec.md \
  --log /tmp/dispatch-task.log
```

Add `--clean-home` only for the task-specific cases described above. Use
`--mode read --tools web_search,web_fetch` for focused web research. A native
controller may run this script in the background and monitor its complete log.

The raw command shapes below remain useful when the extracted module script is
unavailable.

Use a unique prompt file for every parallel run. Research/review (read-only):

    PROMPT_FILE=$(mktemp -t grok-prompt.XXXXXX)
    GROK_RUN_HOME="${BOPEN_GROK_HOME:-$HOME/.grok}"
    env -u XAI_API_KEY -u GROK_API_KEY GROK_HOME="$GROK_RUN_HOME" grok models
    : "${BOPEN_WORKER_MODEL:?Select an id listed by grok models}"
    printf '%s\n' "<imperative; details in SPEC file>" > "$PROMPT_FILE"
    env -u XAI_API_KEY -u GROK_API_KEY GROK_HOME="$GROK_RUN_HOME" \
      grok --prompt-file "$PROMPT_FILE" -m "$BOPEN_WORKER_MODEL" \
      --permission-mode plan --sandbox workspace \
      --no-subagents --output-format plain --cwd <repo> \
      > /tmp/dispatch-<id>.log 2>&1 &

Implementation (edits the repo, in an explicitly isolated worktree) must also
carry the prepared-worktree handoff block from the shared dispatch contract.
The worker verifies cwd and branch before editing and never creates or manages
worktrees, branches, commits, pushes, merges, or cleanup itself:

    PROMPT_FILE=$(mktemp -t grok-prompt.XXXXXX)
    GROK_RUN_HOME="${BOPEN_GROK_HOME:-$HOME/.grok}"
    env -u XAI_API_KEY -u GROK_API_KEY GROK_HOME="$GROK_RUN_HOME" grok models
    : "${BOPEN_WORKER_MODEL:?Select an id listed by grok models}"
    printf '%s\n' "<imperative; details in SPEC file>" > "$PROMPT_FILE"
    env -u XAI_API_KEY -u GROK_API_KEY GROK_HOME="$GROK_RUN_HOME" \
      grok --prompt-file "$PROMPT_FILE" -m "$BOPEN_WORKER_MODEL" \
      --permission-mode acceptEdits --sandbox workspace \
      --output-format plain --cwd <worktree> \
      > /tmp/dispatch-<id>.log 2>&1 &

The examples show the signed-in grok.com lane by removing both supported API
credential variables. For API-key billing, run the same shapes with the
selected credential available and without the prefix. The preflight and
dispatch must use the same auth lane.

For read-only research, use `--permission-mode plan`. Use `acceptEdits`
only for isolated implementation worktrees, never an unrestricted approval
mode. Always retain `--sandbox workspace`. On a Codex macOS host, its outer
filesystem sandbox can prevent Grok from installing this inner sandbox and
return `Operation not permitted`; request host execution escalation for the
exact process while retaining Grok's sandbox. The host may require explicit
user approval naming xAI and the repository context that can be sent. If that
approval or escalation is unavailable, report the lane unavailable for this
run. Do not drop the inner sandbox or silently reroute.
The wrapper runs a startup probe with `grok --sandbox workspace inspect --json`
and stops if Grok cannot load that profile or the inspected cwd differs from
the prepared worker directory. Grok 1.0.13 does not expose an effective
sandbox field in its machine-readable inspection output, so this is evidence
that the named profile was accepted and the inspection process started—not a
claim of kernel-level containment. The worker invocation repeats the explicit
profile flag. Preserve the full log and report session id, auth mode, exact
model, requested sandbox profile, probe result, and process result. Re-run
acceptance in the main.

Treat X posts surfaced during research as leads only; verify each claim
against a primary source before acting on it.

The main or native controller creates isolated worktrees before dispatch. Grok
may race several attempts only when each receives its own prepared worktree.
The main still reviews, chooses, integrates, and verifies the result. For
cross-vendor redundancy, dispatch the same spec independently rather than
assuming an in-lane race is diverse.

Do not blindly wrap the command with gtimeout or timeout on macOS; first verify
that one exists. Without it, monitor the background job.

## Specialist persona

A raw Grok CLI prompt does not automatically receive a plugin agent persona.
When specialist behavior is needed, read
[Grok persona passing](../grok-persona.md) and use the repository helper to
prefix the selected agent body. Do not load that guide for a generic worker.
