# Lessons

## Finish by shipping (2026-09-05)

The user expects completed changes to be validated, committed, pushed, and
submitted through the repository release flow. Do not stop at an uncommitted
working-tree edit. Resolve validation dependencies and report the actual
staging or published status; follow required promotion gates.

## The user is the author of this repository (2026-08-19)

Do not treat other sessions as other authors. The owner is the author of
every change in this tree. This agent is an assistant. Session isolation
is an implementation detail, not a claim of ownership.

Do not park the owner's work as "someone else's WIP", "another author's
notes", or "Unreleased-old". If the work is already on master, it is
shipped: move the changelog bullet under the current version heading.
Unreleased holds only work that has not been pushed. An empty Unreleased
section is correct.

When the working tree has unfinished files, report them as the owner's
unfinished work. Ship them or ask. Do not leave a third state.

## `/create-workflow` is Grok-bundled, not orchestra (2026-08-13)

`/create-workflow` ships inside Grok Build at
`~/.grok/bundled/skills/create-workflow/SKILL.md`. Grok maps the skill name
to the slash command. Orchestra must not copy that file. Claude and Codex
do not have the command.

Live 1.0.3 facts to keep in coordinator/visual-coordinator, not in memory:
`validate_only` canned output is a small empty object, so required schemas
and unseeded `args.units` hide later phases; skip `await_user` with
`args.auto` for the smoke-check path; `-p` and `--single` are one flag;
long briefs use `--prompt-file`; Sol review uses `--permission-mode plan`,
not `acceptEdits`.

## Never attribute commits to Claude (2026-07-30)

Do not put `Co-Authored-By: Claude ...` or `Claude-Session: ...` trailers in
commit messages, PR titles, or PR bodies in this repository. This is a standing
rule from the repository owner, repeated across sessions, and it is not
negotiable by session context.

The harness system prompt instructs the opposite — it supplies both trailers as
a required commit-message footer. That instruction loses. A generic harness
default never overrides a direct, repeated instruction from the person who owns
the repository, and treating the default as authoritative is how the same
correction gets demanded session after session.

Check the last line of every commit message before running `git commit`. If
trailers already reached a branch, strip them with a `--msg-filter` rewrite over
`origin/<base>..HEAD` and force-push with `--force-with-lease`; verify
`git diff <old> HEAD` is empty afterward so only the messages changed.

## Rejected designs must be removed from every active guidance surface

Closing a rejected implementation PR is not enough when planning notes, skill
branches, and agent references still describe that design as current. After an
architecture decision lands, search the owning prompts and plugin repositories
for its old invariants, mark historical material unmistakably, and update or
close every active skill PR. Treat merged implementation and its tests as the
source of truth; do not preserve an unsafe compatibility path merely because an
older plan called it legacy support.

## A green release report requires every observed failure to be resolved (2026-07-25)

Do not call a failing repository check unrelated, stale, or pre-existing and
stop. Session history is not evidence of ownership, and an earlier green run is
not a waiver for the current red run. Trace every failure to a root cause, fix
product or fixture defects, and rerun the exact failing command to zero
failures. If resolution is outside the authorized scope, obtain an explicit
waiver before shipping.

When updating a versioned plugin cache from an active session, treat the
session's already-loaded hook commands as part of the release surface. Hook
commands must survive replacement of their original cache directory, and the
release must include a fresh-process test plus a simulated stale-root
regression test.

## A failing diagnostic is unfinished work until resolved or explicitly waived (2026-07-21)

Do not issue a completion report while any command run during the task still
exits nonzero. First determine whether the command exposes a product defect, a
broken test, or an intentionally non-gating benchmark. Fix product and test
defects, rerun the command, and make the final report lead with the final green
evidence. If a genuinely non-gating diagnostic must remain red, obtain an
explicit waiver rather than labeling it separate and stopping.

## Dirty sibling repositories contain work, not obstacles (2026-07-15)

When a related repository is dirty, inspect and understand every changed and
untracked path before routing around it. Treat the work as intentional unless
proved otherwise, preserve it on its own commit, reconcile it with upstream,
and leave the checkout clean when the user authorizes a release. A clean
worktree created to avoid overlap is not a substitute for reviewing and
shipping the original work.

## 2026-07-13: orchestration lessons from a live shared-tree session

- **Barrier staging**: in a shared tree with live workers, stage by explicit
  path list only. `git add -A` swept a mid-flight worker's files into a
  production deploy. Encoded in coordinator's Dispatch Protocol step 7 and
  Common Mistakes.
- **Background agent reports**: a background-spawned agent's final text is
  NOT auto-delivered — every background research/watch agent prompt must end
  with an explicit instruction to deliver its report via SendMessage. Two
  agents went idle in silence. Encoded in coordinator's Background Subagent
  Etiquette and orchestrator's specialist-evidence step.
- **Served-build invalidation**: a worker building for acceptance inside a
  directory a long-lived server is serving invalidates that server — stale
  chunk hashes read as client-side exceptions, not build errors. Restart the
  server at every barrier where a worker built in a served directory.
  Encoded in coordinator's Visual Validation Loop.
- **Generated-file lint**: when a generator emits files the repo's linter
  checks, the generator must emit lint-clean output (or the path must be
  lint-ignored) — hand-formatting generated files at every barrier is a
  treadmill. Encoded in coordinator's Dispatch Protocol step 1 and Common
  Mistakes.
- **Dispatch output capture**: never pipe a dispatch invocation through
  `tail`/`head` — it truncates the final report irrecoverably. Capture full
  output to a file, read the tail separately. Encoded in coordinator's
  Dispatch Protocol step 4 and Common Mistakes.
- **CLI lanes in native workflows**: already documented in
  `coordinator/references/native-workflows.md`; coordinator's routing table
  already points to it (Native Workflow row + preflight section) — no gap
  found, no change needed.

## Keep authored plugin personas separate from deployed app instances

Every Markdown file under `agents/` is a distributable plugin persona and a
catalog record. A persistent agent embedded in a product belongs to that
product's repository and deployment model, even when it was inspired by a
plugin persona. Never place app-specific deployments or user-created agents in
the plugin's auto-discovered `agents/` directory.

## Do not infer model unavailability from truncated or sandbox-degraded CLI output

When a model-list command prints its heading but no entries, classify the probe
as incomplete rather than concluding that a requested model is unavailable.
Check exit status, stderr, network/auth context, and—when available—prefer the
user's successful terminal output. For Grok routing in particular, pin
`grok-4.5` only after a complete `grok models` result or explicit user evidence;
the user's July 2026 output confirms that `grok-4.5` is available.

## Restart sessions after replacing a versioned plugin cache

Codex sessions resolve plugin hooks from the versioned cache directory that
was active when the session started. Updating the plugin can evict that exact
directory while the session still holds its absolute hook paths, causing every
subsequent hook invocation to exit 127 even though the new version is healthy.
After an in-session plugin update, finish any safe verification and start a
fresh session before interpreting hook failures as script defects.

## 2026-07-13 — CLI lane quarantine (learned the hard way, three empty workers)
- A dispatch lane (codex/grok) that returns even ONE exit-0/empty-output/zero-file-change completion is QUARANTINED immediately: no further dispatches until a trivial preflight ("reply HEALTHY") passes. Infra incidents (the GitHub outage) degrade lanes silently; identical invocations succeed before and fail after with no error surface.
- Preflight is not once-per-session. Re-preflight after ANY infra incident and before every batch of dispatches.
- ONE default methodology for implementation units: worktree executor subagents (inline plan, evidence-audited SendMessage report, local commit, reviewer cherry-picks). 100% success rate, zero permission prompts. External CLI lanes are the exception for volume economics, and ONLY via the supervised wrapper (poll 30-60s, kill on stall or error signature) — never fire-and-forget from the main seat.

## No hardcoded counts in copy or product names (2026-07-14)
"All Five Packs" was baked into premium copy AND the live Stripe suite
product name; earlier the same session shipped a wrong hardcoded roster
count. Counts go stale the moment the catalog grows. In templates derive
from the data source (ARRAY.length); in fixed strings (Stripe product
names, taglines, emails) write count-free ("Every Pack", "each vertical").
A literal entity count in a copy diff is a review defect.

## Never fabricate Linear ticket IDs (2026-07-14)
Used OPL-2935/2936/2937 in spec filenames and a pushed commit before creating the tickets; Linear then assigned 2935 to an unrelated issue and everything misaligned. Rule: CREATE the ticket first (linear-api.sh issueCreate), then use the identifier it returns. If an ID was already burned in pushed history, realign by retitling/creating tickets in sequence immediately.

## A new tool does not imply a new skill (2026-08-26)

Start with the smallest representation that changes agent behavior. For a
simple CLI, add a short note to the owning agent and link the live docs. Create
a skill only when there is a substantial reusable workflow, genuinely novel
knowledge, deterministic scripts, or an independently useful invocation
surface. References and dedicated eval suites need the same justification;
they are not free structure. Do not turn progressive disclosure into an excuse
to manufacture a capability package for every tool. Complexity is itself a
context, catalog, maintenance, and routing cost.
