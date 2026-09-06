# OpenCode CLI Worker

Read this only when OpenCode is the selected worker lane. OpenCode is the
harness, not necessarily the model provider. Inspect the provider configuration
behind the pinned provider/model, disclose that destination, and never assume
where content will be sent.

## Preflight

Confirm opencode, its version, authentication, and the intended model with:

    opencode auth list
    opencode models opencode-go

`opencode auth list` reports the stored `OpenCode Go api` credential;
`OPENCODE_API_KEY` is the environment credential when used. Verify through
these commands without printing or comparing secret material. Do not print
credentials from the auth output. Pin the full provider/model
id. A previously tested id is evidence for that environment, not a
permanent universal id. There is no opencode exec command; the headless
entrypoint is opencode run.

Known Muse Spark lanes through OpenCode:

- `opencode-go/muse-spark-1.3-contributor` is the authenticated Go lane and
  is training-eligible.
- `opencode/muse-spark-1.3-contributor-free` is a temporary Zen promotion
  and is training-eligible. When preflight lists it, pin that exact id for
  the run; do not assume it exists in another environment.
- `opencode-go/muse-spark-1.3` is unavailable unless the live catalog lists
  it; never invent it.

Privacy-sensitive standard Muse must be separately configured and
discovered, for example `meta/muse-spark-1.3`; it is not currently an
OpenCode Go SKU.

Every report identifies the actual provider/model and authentication path
that ran.

## Dispatch

Use a unique prompt file for every parallel run. The message positional must
come before `--file` — see "Non-interactive dispatch: verified gotchas" below
for why order matters:

    PROMPT_FILE=$(mktemp -t opencode-prompt.XXXXXX)
    printf '%s\n' "<imperative; details in SPEC file>" > "$PROMPT_FILE"
    opencode run "Follow the attached task instructions exactly." \
      --model "<provider>/<model>" --dir <repo> \
      --file "$PROMPT_FILE" \
      > /tmp/dispatch-<id>.log 2>&1 &

Use JSON output for scripting or attach to a running server when that avoids
repeated MCP startup. Capture the full log and demand the shared final report.

## Non-interactive dispatch: verified gotchas

Verified on macOS with OpenCode 1.18.20 dispatching a Muse Spark 1.3 worker
from a Claude Code main. These are load-bearing, not cosmetic.

- `opencode run` has no `--prompt-file`; `--file` is an array option, so the
  message positional MUST come before any `--file` flag or yargs swallows the
  message text as a file path (`Error: File not found: Follow the attached…`).
  Verified working form:

      OPENCODE_CONFIG=<worker.json> opencode run \
        "Follow the attached task instructions exactly." --pure \
        --model opencode-go/muse-spark-1.3-contributor --dir <worktree> \
        --file <worktree>/SPEC-<ticket>-<slug>.md --file <prompt.txt> \
        >> <log> 2>&1

- Any auto-rejected permission ends the run. In non-interactive mode
  `opencode run` auto-rejects permission prompts (`! permission requested: …
  auto-rejecting`) and the model then ends its turn, typically exiting 0 with
  no FINAL REPORT and only partial files written. Silence looks like success,
  so the log must be checked for `auto-rejecting`. Every path the spec asks
  the worker to read or write outside `--dir` must be pre-allowed under
  `permission.external_directory`: read-only reference repositories (e.g. a
  sibling repo the spec cites), `/tmp/**`, `/private/tmp/**`, and
  `/var/folders/**` (macOS `mktemp`). Workers also mistype paths occasionally;
  a mistyped path outside the worktree is an `external_directory` rejection
  and aborts the run the same way a real one does.
- Pass a dedicated worker config via `OPENCODE_CONFIG=<file>` (schema:
  https://opencode.ai/config.json). It merges with the global config, so
  explicitly set `"enabled": false` on every global `mcp` server — each run
  otherwise starts them — and pass `--pure` to skip external plugins. Never
  use `--auto`.
- Verified `permission` block:

      {
        "edit": "allow",
        "webfetch": "allow",
        "bash": {
          "*": "allow",
          "git commit*": "deny",
          "git push*": "deny",
          "git checkout*": "deny",
          "git switch*": "deny",
          "git worktree*": "deny",
          "git reset*": "deny",
          "git clean*": "deny",
          "git stash*": "deny",
          "git rebase*": "deny",
          "git merge*": "deny",
          "git branch -d*": "deny",
          "git branch -D*": "deny",
          "git branch -m*": "deny",
          "git branch -M*": "deny",
          "rm -rf*": "deny"
        },
        "read": {
          "*": "allow",
          "*.env": "deny",
          "*.env.*": "deny",
          "*/.env": "deny",
          "*/.env.*": "deny"
        },
        "external_directory": {
          "<reference-repo>/**": "allow",
          "/tmp/**": "allow",
          "/private/tmp/**": "allow",
          "/var/folders/**": "allow"
        }
      }

  Do not deny `git branch*` wholesale: it blocks the read-only
  `git branch --show-current` the dispatch contract tells workers to run.
  Workers then substitute `git rev-parse --abbrev-ref HEAD`, which is a
  workaround for a self-inflicted sandbox gap, not evidence of a real
  environment blocker.
- The config is read at process start; edits apply only to new launches.
  Killing and relaunching a stuck worker after editing `OPENCODE_CONFIG` does
  not update an already-running process. Log evidence: the `> build ·
  <model>` line proves the model that actually ran. Wrap the launch in a
  script that appends `MUSE_START=<utc>` and `MUSE_EXIT=<code>` lines so
  controllers and monitors can grep a terminal state. macOS has no `timeout`
  binary.
- Resumed partial work: when a worker dies mid-task, relaunch with the same
  spec plus an appended "Continuation notes from the dispatcher" section
  (what exists, what remains, known diagnostics to fix). Muse resumes cleanly
  from uncommitted partial work in the same worktree.

## Real subagent invocation

Agents live in .opencode/agent/, .opencode/agents/, or opencode.json. The
--agent option selects a primary or all-mode agent; it does not directly start
one declared with mode: subagent.

For a real child, start a headless primary session and invoke the named child
with an @mention:

    opencode run "@general Follow the attached task instructions exactly." \
      --model "<provider>/<model>" --dir <repo> \
      --file "$PROMPT_FILE"

A subagent without its own model inherits the parent model. Verify a child
marker such as General Agent in the captured output before claiming delegation;
a primary build line alone proves nothing.

OpenCode has no native multi-stage workflow engine. The caller owns sequencing
and barriers. Skills are drop-in and may be discovered from .claude/skills/;
hooks are plugin event handlers, not a portable hooks file.

Custom providers can expose Muse or Luna through OpenCode. Verify the provider
block and model list, then apply this guide; do not also load the direct Muse or
Codex CLI guide unless that CLI is separately selected.
