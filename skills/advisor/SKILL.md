---
name: advisor
version: 0.0.2
description: >-
  Active when a Claude Code or Codex main session needs an independent,
  read-only second opinion at a commitment boundary. Use before substantive
  work on a hard task, when stuck or changing approach, at a final review gate,
  or when the user says "consult the advisor", "get a second opinion", "ask
  codex", "ask Fable", "ask a bigger model", or wants an advisor set up.
  Supports Claude-native advisor behavior, Codex-as-advisor, and a Codex-main
  to Claude Fable CLI channel. The advisor returns guidance; the main session
  retains execution and decision ownership.
---

# Advisor

The main session borrows independent judgment at the few moments that determine
whether the next hour of work is wasted. The advisor may be stronger, simply
different, or context-clean. It never types the implementation; it advises.

**You ARE the main executor and decision owner.** The advisor is consulted,
never delegated implementation. If another model should write bounded code,
that is the `coordinator` worker pattern. Use `orchestrator` when the current
main combines specialist agents, external workers, and an advisor.

The advisor's value is only partly the stronger model: a consult also
arrives **context-clean**, free of this session's accumulated assumptions.
That's why a consult can pay even between equal tiers — and why every
consult package must stand alone.

## Choosing the Advisor Channel

Four channels. Detect the current host and what exists before picking; never
assume.

| Channel | How it works | Prefer when |
|---------|-------------|-------------|
| **codex as advisor** | Dispatch a read-only consult to codex (plugin or CLI) | A codex quota exists — subscription capacity is usually the cheapest premium intelligence available |
| **Native advisor tool** | Claude Code's built-in advisor (`/advisor`, `advisorModel` setting, `--advisor` flag): the executor consults a stronger Claude model mid-turn, server-side | The advisor should be a Claude model and the account has capacity for it |
| **Premium Claude subagent** | Spawn a read-only `Agent` (Read/Grep/Glob only) pinned to a stronger Claude model; it inspects the repo fresh and returns a verdict | The advisor should be Claude AND the question needs repo inspection the transcript doesn't carry |
| **Fable CLI from Codex** | Run a clean, read-only Claude Code print session using the configurable `fable` model-family alias | The main is Codex and an independent Claude opinion is valuable, especially for Claude-specific work |

Passive detection depends on the host:

1. On Codex, check `command -v claude`, `claude --version`, and
   `claude auth status`. The Fable lane is unavailable if CLI authentication
   is unavailable; do not silently substitute another vendor.
2. On Claude, check `command -v codex` and whether `codex:*` plugin commands
   are available.
3. Is `advisorModel` set in `~/.claude/settings.json` or the project's
   settings? (Slash commands are user-only — don't try to run `/advisor`.)
   If it's absent and the session wasn't launched with `--advisor`, treat
   the native channel as unconfigured and suggest the user run `/advisor`
   to enable it. `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` in the environment
   means the native channel is off regardless.
4. The premium-subagent channel needs no install — but confirm the intended
   stronger model is actually available to the account (see the
   silent-downgrade footgun below); an unavailable pin degrades to the
   session model without erroring.
5. No channel available at all? Don't silently proceed unadvised — offer to
   enable one (the codex install/auth steps live in the coordinator skill's
   "Enabling a lane" section).
6. Present the finding and recommendation to the user before first use —
   "codex is installed; recommend it as advisor" or "advisorModel is already
   set to X; using the native tool" or "Claude CLI is authenticated; recommend
   the Fable lane" — and let them override. When multiple channels exist and
   the user has not expressed a preference, ask once, then keep the answer for
   the session.

From a Claude main, avoid launching another `claude -p` process unless the user
asks; the native advisor or a native subagent is cleaner. The deliberate
exception is the cross-host Fable channel from a Codex main. Its preflight must
report which authentication path will be used because a fresh CLI invocation
can draw from subscription capacity or bill an API key.

### Native advisor notes

- The advisor sees the full transcript but runs **toolless** — it cannot read
  files or run commands. Put the evidence in the conversation (paste the
  failing output, the relevant snippet) *before* consulting, or the advisor
  advises blind.
- The advisor must be a Claude model at least as capable as the executor;
  invalid pairings are rejected outright.
- There is no setting to force or cap consult frequency — steer it with
  instructions ("consult the advisor before you continue") and the timing
  rules below.
- Advisor usage is billed/metered at the advisor model's own rates and counts
  against plan limits — a consult is never free. Budget accordingly.

### Premium-subagent notes

- Pin the model on the `Agent` call and keep the toolset read-only — the
  advisor advises; it must not edit.
- **Silent-downgrade footgun:** when a pinned Claude model isn't available
  to the account, the subagent silently falls back to the session's model —
  the "advisor" becomes the executor consulting itself, and nothing errors.
  Require the advisor to state which model it is running as the first line
  of its reply; treat a session-tier answer as no consult and switch
  channels.
- It does not see this conversation — package the consult fully (see below).
  Like codex, it can read the repo, which the native advisor cannot.

### Fable CLI from a Codex main

Use this channel when the current main is Codex and an independent Claude
opinion is useful. It is especially valuable for reviewing Claude agents,
hooks, plugin behavior, or prompts where a Claude-native perspective reduces
guesswork.

Prepare the complete consult in a file. Feed it over stdin so shell quoting,
prompt length, and repository text cannot become command interpolation:

```bash
ADVISOR_MODEL="${BOPEN_ADVISOR_MODEL:-fable}"
PROMPT_FILE="/absolute/path/to/prepared-advisor-consult.md"

env -u ANTHROPIC_API_KEY claude \
  --print \
  --safe-mode \
  --model "$ADVISOR_MODEL" \
  --effort high \
  --permission-mode plan \
  --tools "Read,Grep,Glob" \
  --no-session-persistence \
  < "$PROMPT_FILE"
```

- `fable` is a stable model-family alias chosen for this advisor lane, not a
  claim about a permanently latest version. Set `BOPEN_ADVISOR_MODEL` when the
  user chooses another available Claude model.
- `--safe-mode` keeps personal plugins, hooks, memory, and project prompt
  customizations out of the second opinion. This preserves context independence.
- `--permission-mode plan` plus `Read,Grep,Glob` makes the lane repository-aware
  but unable to edit or run shell commands. For a context-only consult, pass an
  empty tool list instead.
- `--no-session-persistence` prevents the consult from entering normal Claude
  session history. Remove it only when the user explicitly wants a resumable
  advisory thread.
- `env -u ANTHROPIC_API_KEY` deliberately prefers the signed-in Claude Code
  subscription rather than an ambient API key. If the user explicitly wants
  API billing, omit that prefix and disclose the change.

This is an external data boundary. The consult file and any repository files
the read tools inspect can be sent to Anthropic. Before the first Fable consult,
say what will be shared and obtain approval unless the user already explicitly
authorized that lane for the task. Exclude secrets, credentials, and unrelated
proprietary content.

If `claude auth status` fails, the selected model is unavailable, or the CLI
reports a billing/authentication mismatch, stop and report the lane as
unavailable. Do not silently replace Fable with a different advisor.

### codex-as-advisor notes

- **Read-only is correct here.** Never add write flags to a consult — the
  advisor advises; it must not edit. Bare `codex exec` is read-only by
  default, which is right for once. The plugin is the opposite: it defaults
  tasks to a write-capable run unless the request reads as
  review/diagnosis/research-only — so when consulting through the plugin,
  phrase the dispatch explicitly as advisory ("advisory only, no edits") so
  it stays read-only.
- Unlike the native advisor, codex **can read the repo** (read-only). Prefer
  it for questions that require inspecting code the conversation hasn't
  seen; prefer the native channel for questions answerable from the
  transcript alone.
- With the plugin installed, consults can resume a thread (`--resume`) — an
  advisory thread that keeps context across consults is markedly better for
  follow-ups than a cold start each time.
- Demand structure or risk silence — an uninstructed codex run can return
  nothing. Use the advice contract below in every consult prompt.

### The advice contract (all channels)

End every consult prompt with (verbatim or close):

> Give a verdict, not a survey: "do X, not Y, because Z" plus the single
> risk that decides it. If the plan is sound, say so in one line — do not
> manufacture objections to justify the consult. If missing information
> would change the answer, name it precisely and say what each answer would
> imply. Keep it under 200 words unless the architecture genuinely demands
> more.

## When to Consult

Consults happen at **commitment boundaries** — the decisions that determine
whether the next hour of work is wasted: an architecture choice, a data
migration, an API shape, a refactor strategy.

Consult **before substantive work, not after**. Orientation — finding files,
reading code, reproducing the bug — is not substantive work; do that first so
the consult is informed. Writing, editing, and committing to an
interpretation are substantive.

- **Before the first state-changing action** on a hard or ambiguous task:
  plan sketched, evidence gathered, then one consult to pressure-test the
  approach before any file changes.
- **When believing the task is complete** — one consult as a review gate.
  Make the deliverable durable *first* (write the file, save the result): a
  consult takes time, and a durable result survives an interrupted session
  where an unwritten one doesn't.
- **When the same problem has resisted two distinct attempts** — a third
  attempt without new judgment is usually the first attempt again. Also when
  stuck more generally: errors recurring, approach not converging, results
  that don't fit the mental model.
- **Before changing approach** — the consult is cheaper than the rewrite.

Do NOT consult for mechanical steps, trivially verifiable facts, or anything
a test run answers faster. Consults are metered; a session that consults on
every turn has inverted the economics — and one that never consults on a
hard task has wasted the safety net. A few consults per task, each at a real
decision point, is the shape to aim for.

## Packaging a Consult (external and subagent channels)

The advisor only knows what the consult carries. Include:

1. **Goal** — what the task is, one paragraph.
2. **Constraints** — what must not change, conventions in force.
3. **State** — what has been tried, what happened, current hypothesis.
4. **Evidence** — the failing output, the relevant snippet, or file paths
   for codex to read.
5. **The question** — one specific decision to advise on, not "thoughts?".
6. The advice contract from above.

## Weighing the Advice

- **Act on the verdict or surface the disagreement — never silently ignore
  it.** Give the advice serious weight: the advisor is the stronger model,
  and it was consulted for a reason.
- If a recommended step **fails empirically**, or primary evidence
  contradicts a specific claim (the file says X, the advisor assumed Y),
  adapt — but don't silently switch. Surface the conflict in one reconcile
  consult: "I found X, you suggest Y — which constraint breaks the tie?" The
  advisor may have underweighted the evidence; a reconcile consult is
  cheaper than committing to the wrong branch.
- A passing self-test is NOT evidence the advice is wrong — it may be
  evidence the test doesn't check what the advice is checking.
- Report to the user when advice was sought and materially changed course;
  the consult trail is part of the work's reasoning.

## Red Flags

| Thought | Reality |
|---------|---------|
| "I'll just decide myself, consulting is a detour" | On a hard call, the consult is minutes; the wrong branch is hours. That's the trade this skill exists for. |
| "I'll skip the upfront consult and just confirm at the end" | The completion review gate doesn't replace the pre-work consult; advice that only ever arrives after the code exists becomes rubber-stamping. |
| "The advisor should just fix it" | Then it's not an advisor — that's the coordinator pattern upside down. Advice comes back; execution stays here. |
| "My test passed, so the advice was wrong" | The test may not measure what the advice addressed. Reconcile before discarding. |
| "I'll consult on every step to be safe" | Metered consults on mechanical steps invert the economics. Decision points only. |
| "The external advisor returned nothing, skip the consult" | Re-send once with the advice contract attached; silence is a transport/reporting failure, not a verdict. |
