# Grok CLI Worker

Read this only when the Grok Build CLI is the selected external worker. A
dispatch can send the prompt, spec, and selected repository content to xAI;
apply the Coordinator disclosure rule before first use.

Grok is a usage-credit-pressure fallback, not the normal coding lane. Use it
only when that pressure is explicit, pin `grok-4.7`, and never dispatch Grok
4.6. Otherwise use the preferred `claude-opus-5-5` coding worker through the
Claude Code CLI. The wrapper
enforces this for any casing of the id, and for a custom id whose
`config.toml` entry (parsed as real TOML, either quote style) is served by xAI
or points at a Grok or `gpt-5.6` model; a non-Grok id with no parseable entry,
no explicit `model`, or no `base_url` is refused. Provider-qualified xAI ids
(`xai/…`, `openrouter/x-ai/…`) get the Grok pin and credit gate. It
rejects every Grok model except `grok-4.7`, and rejects
`grok-4.7` unless `--credit-pressure` or `BOPEN_USAGE_CREDIT_PRESSURE=1` is set.

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
exact listed id; never ride a changing CLI default. Its default,
`claude-opus-5-5`, runs on this lane only through a quoted custom Grok model
entry; when none is listed, dispatch it through the Claude Code CLI instead.
Reviews use a quoted `gpt-6-sol` entry at `--effort xhigh`. Use `grok-4.7` only under
usage-credit pressure and only through the wrapper below; any other Grok id is
out of policy. If authentication, model
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
  --model grok-4.7 \
  --credit-pressure \
  --mode write \
  --cwd /absolute/path/to/worktree \
  --branch codex/example-task \
  --base-ref origin/dev \
  --ownership 'src/feature/** and tests/feature/**' \
  --prompt-file /absolute/path/to/spec.md \
  --log /tmp/dispatch-task.log
```

Pass `--effort` (`none` through `xhigh`) to set Grok's reasoning effort; the
visual coordinator's Grok-lane exports use this wrapper with that flag.
Add `--clean-home` only for the task-specific cases described above. Use
`--mode read --tools web_search,web_fetch` for focused web research. A native
controller may run this script in the background and monitor its complete log.

Every Grok-CLI dispatch runs through that wrapper — Grok models and non-Grok
custom ids such as `gpt-6-sol` alike. The wrapper is the only place the
GPT-5.6 ban, the `grok-4.7` pin, the credit gate, and their case-insensitive
matching live, so there is no raw `grok` dispatch recipe to keep in sync. If the
wrapper is unavailable, the Grok lane is unavailable for that run; do not
hand-roll a `grok --prompt-file` call.

Use a unique prompt file and log for every parallel run. Research
(read-only):

    bash /absolute/path/to/coordinator/scripts/run-grok-worker.sh \
      --auth grok.com --model "$BOPEN_WORKER_MODEL" --mode read \
      --cwd <repo> --prompt-file <spec> --log /tmp/dispatch-<id>.log

Code review (read-only) never inherits the worker model or default effort. It
runs on a quoted `gpt-6-sol` entry at `xhigh`:

    bash /absolute/path/to/coordinator/scripts/run-grok-worker.sh \
      --auth grok.com --model gpt-6-sol --effort xhigh --mode read \
      --cwd <repo> --prompt-file <review-brief> --log /tmp/review-<id>.log

Implementation in an explicitly isolated worktree. The wrapper verifies the
cwd, branch, and base ref and prepends the prepared-worktree handoff block; the
worker never creates or manages worktrees, branches, commits, pushes, merges,
or cleanup itself:

    bash /absolute/path/to/coordinator/scripts/run-grok-worker.sh \
      --auth grok.com --model "$BOPEN_WORKER_MODEL" --mode write \
      --cwd <worktree> --branch <branch> --base-ref <ref> \
      --ownership '<owned paths>' --prompt-file <spec> --log /tmp/dispatch-<id>.log

`--auth grok.com` removes both supported API credential variables for the
signed-in account; `--auth api` keeps `XAI_API_KEY` for API billing. The
wrapper's preflight and dispatch always use the same auth lane.

The wrapper uses `--permission-mode plan` in read mode and `acceptEdits` only
in write mode for isolated worktrees, never an unrestricted approval mode, and
always retains `--sandbox workspace`. On a Codex macOS host, its outer
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
