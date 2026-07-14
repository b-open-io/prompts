# Lessons

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
