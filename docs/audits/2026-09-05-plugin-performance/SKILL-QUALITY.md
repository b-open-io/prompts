# Authored skill/agent semantic audit

Snapshot: `/Users/satchmo/code/worktrees/prompts-factory-worker`, dev commit `6ba4688`, 2026-09-05. Read-only source audit; no source changes and no paid evaluations.

Read the optimization blog (`bopen-ai/src/data/posts.ts:386-690`), repository AGENTS.md, requested plugin-dev skill-development, and Codex skill-creator. The blog's useful intent is to separate startup metadata from invoked bodies, preserve routing through representative positive/negative ablations, keep modules independently installable, and validate downstream references. The inherited authoring guidance has not fully adopted that intent.

## Findings

### SQ-01 — P1: Authoring agent teaches an incorrect read-only security boundary

Evidence: `modules/plugin-kit/agents/prompt-engineer.md:965`, `:992-1005` (also `:947`, `:1396`). It says `allowed-tools` restricts available tools, and illustrates `safe-file-reader` with `allowed-tools: Read, Grep, Glob`, claiming the resulting skill cannot modify files.

Current primary Claude documentation explicitly says `allowed-tools` pre-approves listed tools for the invoking turn and does **not** restrict availability of other tools; ordinary permission settings still govern them. See [Claude skills, pre-approve tools](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill), checked 2026-09-05. Other already-approved tools remain callable. Thus generated read-only skills are not read-only by construction.

Fix: correct the permission semantics throughout this agent; distinguish approval grants, tool exclusion, and prose intent. Use target-harness-supported exclusion/permission controls for actual restrictions and test attempted writes in an isolated workspace. Do not mechanically translate Claude fields into a Codex security promise.

### SQ-02 — P1: Publishing skill contradicts the repository's dev-to-production release path

Evidence: `modules/plugin-kit/skills/skill-publish/SKILL.md:119-133` explicitly runs `git push origin <default-branch>` after a release commit and immediately proceeds to installation verification. `AGENTS.md:5-10` instead requires a feature PR into dev, a standing dev→default promotion PR, 24-hour cooling period, and `/approve`; it forbids direct default pushes.

Impact: the public publishing recipe attempts a protected-branch push and frames a dev manifest bump as publishable immediately. This is particularly relevant to the user's requested dev→production workflow.

Fix: begin with the target repository's release policy, route this repository through feature→dev→promotion, and distinguish "bump committed on dev" from "published". Generic repositories can use their own permitted path; remove direct-default push as the universal default.

### SQ-03 — P1: Benchmark methodology selects cases for baseline failure, hiding regressions

Evidence: `modules/plugin-kit/skills/benchmark-skills/SKILL.md:77-84` says every eval must be a trap and to redesign/drop any case the baseline passes. `:187-188` allows publication only for positive delta. `:16-38` excludes system-access and multiturn skills entirely. The later routing section correctly requires negative cases that pass in both arms (`:280-282`), so its own methodologies disagree.

Impact: this cherry-picks the sample toward a gain and cannot detect damage to previously correct behavior. Equal correctness with fewer tokens/tool calls or less latency is also excluded from success, directly missing the user's efficiency goal. A limitation of one text-response harness is being presented as a limit on what can be evaluated.

Fix: separate representative held-out tasks, regression/control cases, and adversarial cases; retain baseline successes. Gate on minimum absolute correctness and absence of material regressions; report paired cost/latency/tool-use differences at equivalent quality, sample counts and uncertainty. Route tool workflows to isolated artifact/trace tests and target-harness evals instead of declaring them unbenchmarkable. Keep discovery and functional tests distinct.

### SQ-04 — P2: Routing tutorial asks for a skill but grades an agent

Evidence: `modules/plugin-kit/skills/benchmark-skills/SKILL.md:236` asks "Reply with only the skill you would invoke." The accompanying regex at `:244` only accepts `review:code-auditor` / `code-auditor`. This is an agent, authored in `modules/review/agents/code-auditor.md:2`; there is no matching authored skill.

Impact: copied examples mark a correct skill-selection answer wrong, or train the evaluator to accept the wrong resource kind. The article's original example asks for `subagent_type`; the skill adaptation changed that part without changing its grader.

Fix: use an agent-selection prompt and agent grader together, or choose a real skill in both. Validate expected resource identity **and type** against the catalog before evaluation.

### SQ-05 — P2: Auditor would undo the demonstrated catalog compression

Evidence: `modules/plugin-kit/skills/agent-auditor/SKILL.md:95` requires the exact verbose style "This skill should be used when..." and rejects "Use when...". `references/skill-quality-guide.md:30` repeats this. `AGENTS.md`'s Skill Development Resources section repeats it too. The blog explicitly identifies that preamble as removed catalog overhead. `agent-auditor/SKILL.md:142-145` requires literal `Skill(core:benchmark-skills)` and `Skill(core:agent-auditor)` entries in agent `tools:` although both resources now belong to plugin-kit and `prompt-engineer` uses bare `Skill` access.

Impact: following the audit fails correctly compressed descriptions, adds redundant tool enumerations, and recommends nonexistent names. The auditor's own startup-weight discussion recognizes the bare Skill optimization (`:47-51`), making the conflict internal.

Fix: grade discriminating semantics and measured routing rather than grammatical preamble; update namespaces to plugin-kit; recognize broad Skill access or the actual target-host tool contract rather than demanding explicit lists. Add a small deterministic fixture proving these false positives stay fixed. The older plugin-dev writing snapshot itself requests the verbose style, so document the project-specific deviation rather than silently oscillating between instructions.

### SQ-06 — P2: Authoring guidance hard-codes visible chain-of-thought as necessary

Evidence: `modules/plugin-kit/agents/prompt-engineer.md:152-156` states "Without outputting, no thinking occurs!" and directs `<thinking>` / "Think step-by-step" prompting. The nearby universal 3–5-example prescription (`:146-150`) is likewise not conditional on target model or demonstrated need.

Current [OpenAI reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices#how-to-prompt-reasoning-models-effectively), checked 2026-09-05, says reasoning models reason internally, such prompting is unnecessary and can hinder performance, and recommends zero-shot first. This also contradicts this agent's own requirement to research the target model (`:112-127`).

Fix: replace the universal recipe with concise outcome/constraint guidance and target-specific conditional reference material. Ask for useful conclusions/evidence, not private thought traces. Evaluate examples only where they help a real task; no claim that a universal number improves quality.

### SQ-07 — P2: Prompt engineer still points authors at the pre-plugin / pre-module layout

Evidence: `modules/plugin-kit/agents/prompt-engineer.md:88-100` directs distributed commands to `user/.claude/`, says users copy them manually, and names `agents/prompt-engineer.md` as the distributed agent. Actual ownership is `modules/plugin-kit/agents/prompt-engineer.md`; repository guidance uses root/module `commands/`, `agents/`, `skills/`. Its mandatory roster discovery at `:45-55` only lists root `agents/`, missing specialists now moved to modules.

Impact: new commands can land outside discoverable delivery paths; roster checks can miss existing module agents and create duplicates. The knowledge lookup at `:117` also points to root `references/prompt-engineer/model-card-sources.md`, outside the plugin-kit extraction boundary. The source repo contains it; the independently installed module cannot reach it unless packaging supplies it separately.

Fix: resolve the owning plugin/module before writing; scan the actual full catalog for duplication; keep module-required references inside the module. Validate the installed/extracted module, not only source-tree paths. Coordinate the packaging detail with the harness audit.

### SQ-08 — P2: Cross-harness audit applies Claude invocation policy as a universal requirement

Evidence: `agent-auditor/SKILL.md:72-75` requires disabling automatic invocation for any interaction, confirmation, or irreversible action; `prompt-engineer.md:1029-1040` applies the same categorical rule. The requested Codex skill-creator explicitly says to preserve default implicit discovery unless the user asks to change it and to place authorization at actual mutation boundaries.

Impact: an audit of shared source can hide useful publishing/setup guidance from discovery across unrelated harnesses, rather than controlling mutation. This is a policy/portability conflict, not evidence that any specific current publication caused unauthorized writes.

Fix: make policy checks host-aware and preserve existing invocation policy unless a scoped user request changes it. Separate selection from approval. Do not automatically bulk-change invocation flags as an audit cleanup.

### SQ-09 — P2 opportunity: Reduce the invoked authoring context without losing operational invariants

Evidence: `modules/plugin-kit/agents/prompt-engineer.md` is 2,069 lines / 8,817 whitespace words / 65,925 bytes. It inlines tutorials for commands, permissions, hooks, skill authoring, and examples even while mandating upstream authoring skills. `:75-81` additionally requires passing every delegated report through verbatim and prohibits summaries. `AGENTS.md` is 559 lines / 3,483 words / 27,350 bytes with repeated version rules and legacy directory narratives.

Impact: startup-description gains do not remove this per-invocation payload. The same concepts now have multiple independent copies, demonstrated by the stale permission and layout claims above. Verbatim output multiplies response size even when source artifact links preserve provenance.

Fix: retain role, ownership discovery, release constraints, and essential routing in the agent; move only genuinely needed host/mode details to module-local references; remove copied manuals in favor of maintained provider skills/docs. Permit concise synthesis linked to full saved reports. Measure actual invoked tokens and behavior before/after, separately from startup weight. Do not blindly trim all files to a word target.

### SQ-10 — P3: Setup discovery description incorrectly claims no installation

Evidence: `skills/setup/SKILL.md:5-6` says "it installs nothing itself"; its body `:15-17` describes user-triggered installation, and its preferred launcher `:49-50` installs/builds dependencies on first run.

Fix: describe audit + plan + optional user-triggered installation accurately. This is a metadata/body consistency issue; not a claim that the existing click-to-install path lacks authorization.

## Coverage / limitations

Read in full: benchmark-skills, agent-auditor, skill-publish, setup; relevant auditor testing/quality references; focused sections across prompt-engineer; all AGENTS.md; blog; both requested authoring guides. Other authored skill entrypoints were inventoried for context but **not** semantically audited end-to-end. No paid pack ownership in this subtask. No live model runs, no plugin installs, no publication, no claim of proven cross-harness behavioral parity. Priority labels estimate the effect of following instructions, not measured incident frequency.

Implementation observations handed to parent for the separate harness audit: `scripts/benchmark.tsx:467-477` scans only root skills; `:484-510` spawns Claude with inherited environment/cwd and `--dangerously-skip-permissions` without explicit tool restriction or plugin isolation. These require a separate implementation finding/verification rather than being silently folded into this semantic review.
