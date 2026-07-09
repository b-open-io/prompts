---
name: advisor
description: Active when the session's main model is a cheaper executor (Sonnet/Haiku tier) doing non-trivial implementation work and premium intelligence is available to consult — a codex quota or a stronger Claude model. Triggers before substantive work begins on a hard task, when stuck or about to change approach, or when the user says "consult the advisor", "get a second opinion", "ask codex", "ask a bigger model", or wants an advisor set up. The reverse of the coordinator pattern: the cheap model executes everything; premium intelligence is consulted at decision points only.
---

# Advisor

The executor stays cheap; the intelligence gets borrowed. A lower-tier model
doing multi-step work produces near-premium quality when a stronger model
reviews its plan at the few moments that actually need judgment — most turns
are mechanical, and having an excellent plan is what's crucial. The premium
model never types; it advises.

**You ARE the executor.** The advisor is consulted, never delegated to — it
returns guidance, and the work continues here. If the plan is to have the
premium model *do* the work, that is the `coordinator` skill's seat, not
this one.

The advisor's value is only partly the stronger model: a consult also
arrives **context-clean**, free of this session's accumulated assumptions.
That's why a consult can pay even between equal tiers — and why every
consult package must stand alone.

## Choosing the Advisor Channel

Two channels. Detect what exists before picking; never assume.

| Channel | How it works | Prefer when |
|---------|-------------|-------------|
| **codex as advisor** | Dispatch a read-only consult to codex (plugin or CLI) | A codex quota exists — subscription capacity is usually the cheapest premium intelligence available |
| **Native advisor tool** | Claude Code's built-in advisor (`/advisor`, `advisorModel` setting, `--advisor` flag): the executor consults a stronger Claude model mid-turn, server-side | The advisor should be a Claude model and the account has capacity for it |
| **Premium Claude subagent** | Spawn a read-only `Agent` (Read/Grep/Glob only) pinned to a stronger Claude model; it inspects the repo fresh and returns a verdict | The advisor should be Claude AND the question needs repo inspection the transcript doesn't carry |

Passive detection, in order:

1. `command -v codex` — CLI present? Are `codex:*` plugin commands available?
2. Is `advisorModel` set in `~/.claude/settings.json` or the project's
   settings? (Slash commands are user-only — don't try to run `/advisor`.)
   If it's absent and the session wasn't launched with `--advisor`, treat
   the native channel as unconfigured and suggest the user run `/advisor`
   to enable it. `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` in the environment
   means the native channel is off regardless.
3. Present the finding and recommendation to the user before first use —
   "codex is installed; recommend it as advisor" or "advisorModel is already
   set to X; using the native tool" — and let them override. When both exist
   and the user hasn't expressed a preference, ask once with a recommended
   default based on what was found, then stick with the answer for the
   session.

Avoid `claude -p --model <premium>` as a consult channel unless the user
asks for it: a fresh CLI invocation may bill API usage instead of drawing on
subscription capacity, which defeats the economics this skill exists for.

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

## Packaging a Consult (codex and premium-subagent channels)

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
| "codex returned nothing, skip the consult" | Re-send with the structured-reply demand; an uninstructed run going silent is a known failure, not a verdict. |
