# disler (IndyDevDan) Research — Integration Candidates for bopen-tools

> Research date: 2026-03-09
> Profile: https://github.com/disler | YouTube: @indydevdan
> 3,360 followers, 41 repos, updated daily. "Betting the next 10 years on AGENTIC software."

## Executive Summary

disler is the most prolific public builder on Claude Code hooks, skills, and multi-agent orchestration outside Anthropic. His repos validate our skills-first architecture and reveal specific patterns we're missing: hook-enforced validation, plan/build agent splits, wave-based fan-out, observability pipelines, and multi-model consensus.

**Key validation**: `beyond-mcp` repo benchmarks MCP vs CLI vs Scripts vs Skills and concludes skills preserve context best at scale — directly confirms our approach.

---

## Top Repos by Relevance

| Repo | Stars | Category | Key Pattern |
|------|-------|----------|-------------|
| `claude-code-hooks-mastery` | 3,247 | Hooks | 13-event lifecycle, Builder/Validator teams, exit code control flow |
| `claude-code-hooks-multi-agent-observability` | 1,250 | Observability | Hooks → HTTP → SQLite → WebSocket → Vue dashboard |
| `just-prompt` | 718 | MCP | Multi-provider MCP, CEO & Board consensus pattern |
| `infinite-agentic-loop` | 525 | Orchestration | Wave-based parallel agent batching (waves of 5) |
| `single-file-agents` | 431 | Agent design | UV inline deps, compute loops, schema-first context |
| `claude-code-damage-control` | 384 | Security | `patterns.yaml` tiered path protection via PreToolUse |
| `agent-sandbox-skill` | 333 | Skills | E2B sandbox isolation, `/plan-build-host-test` command |
| `claude-code-is-programmable` | 293 | Automation | `claude -p` as Unix pipeline, `--allowedTools` scoping |
| `aider-mcp-server` | 292 | MCP | Atoms architecture, explicit tool registration |
| `agentic-drop-zones` | 200 | Automation | File-watching triggers agents on directory drop |
| `bowser` | 186 | Architecture | Four-layer composable: Skill → Subagent → Command → Justfile |
| `quick-data-mcp` | 146 | MCP | Tripartite MCP (Tools + Resources + Prompts) |
| `fork-repository-skill` | 136 | Skills | Terminal forking, model racing, context delegation |
| `beyond-mcp` | 129 | Architecture | Context cost analysis: MCP > CLI > Scripts > Skills |

---

## Patterns Worth Adopting

### Pattern 1: Hook Exit Codes as Control Flow

**Source**: `claude-code-hooks-mastery`, `claude-code-damage-control`

```
Exit 0  → success, stdout visible in transcript
Exit 2  → BLOCK (abort tool call, stderr fed back to Claude)
Other   → non-blocking, execution continues
```

PreToolUse hooks receive JSON on stdin:
```json
{
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf node_modules" }
}
```

PostToolUse can block with:
```json
{"decision": "block", "reason": "Ruff lint failed"}
```

**What we'd gain**: Deterministic guardrails that don't rely on prompt instructions. Block `.env` access, `rm -rf`, `git push --force` at the hook level. Validate SKILL.md frontmatter on every Write.

---

### Pattern 2: Plan/Build Agent Split

**Source**: `claude-code-hooks-mastery`

Two-phase workflow:
- **`/plan_w_team`**: Read-only planning agent. Writes spec to `specs/` with mandatory sections (Task, Objective, Files, Steps, Acceptance Criteria). Explicitly forbidden from writing code.
- **`/build`**: Reads spec, executes with full tool access.

A `Stop` hook with exit code 2 prevents session close until the plan has all required sections.

**Builder/Validator pair**: Builder gets full tools. Validator gets Read, Glob, Grep only. Hooks enforce the boundary.

**What we'd gain**: Reduced thrashing in skill/agent creation. Our prompt-engineer could use this split — plan the skill structure first, then build it.

---

### Pattern 3: Wave-Based Parallel Fan-Out

**Source**: `infinite-agentic-loop`

```
Single:      1 agent, 1 iteration
Small batch: 5 parallel agents
Large batch: 20 iterations in waves of 5
Infinite:    waves until context limit
```

Each agent in a wave receives **unique creative direction** to prevent homogeneous output. The orchestrator reads existing output before spawning to prevent duplication. Context budget is tracked as a first-class constraint.

**What we'd gain**: Our `dispatching-parallel-agents` skill could add wave management and context budget awareness. Prevents runaway subagent spawning.

---

### Pattern 4: HOP/LOP Prompt Decomposition

**Source**: `bowser`, `nano-agent`

**HOP (Higher Order Prompt)**: Resolves configuration — which agent, which skill, which mode — then delegates.
**LOP (Lower Order Prompt)**: Executes the actual task.

```
User: /bowser:hop-automate amazon-add-to-cart "earbuds"
  ↓ HOP resolves: skill=claude-bowser, mode=headed
  ↓ LOP (amazon-add-to-cart.md) executes steps
```

**What we'd gain**: Clean separation of routing from execution. Our front-desk agent does this partially but informally.

---

### Pattern 5: Observability Pipeline

**Source**: `claude-code-hooks-multi-agent-observability`

```
Claude Agents → Hook Scripts → HTTP POST → Bun Server → SQLite (WAL) → WebSocket → Vue Client
```

Each event includes: `source_app`, `session_id`, `hook_event_type`, `timestamp`, `payload`, `summary`. Dual-color timeline: app identity + session identity.

SubagentStart/SubagentStop hooks track nested agent lifecycles. UserPromptSubmit captures what agents are actually asked.

**What we'd gain**: Real-time visibility into all agent activity across multi-agent sessions. We have hooks infrastructure but no centralized event stream.

---

### Pattern 6: CEO & Board Multi-Model Consensus

**Source**: `just-prompt`

1. Send same prompt to N "board member" models in parallel
2. Collect all responses
3. Pass structured XML with all responses to "CEO" model (default: o3)
4. CEO synthesizes final decision
5. All outputs saved for audit

Provider prefix notation: `o:gpt-4o`, `a:claude-opus-4`, `g:gemini-2.5-pro`

**What we'd gain**: Multi-model voting for high-stakes decisions (architecture reviews, security audits) without paying frontier prices for every perspective.

---

### Pattern 7: Atoms Architecture for MCP/Skills

**Source**: `aider-mcp-server`

```
src/
├── server.py              # Protocol layer only — no business logic
├── atoms/
│   ├── data_types.py      # All Pydantic models (single source of truth)
│   ├── utils.py           # Shared constants
│   ├── logging.py         # Centralized logging
│   └── tools/
│       ├── tool_one.py    # Pure function, no MCP deps
│       └── tool_two.py    # Pure function, no MCP deps
└── tests/atoms/tools/     # Mirror structure
```

Error contract: Tools never raise — always return `{"success": bool, "result": ..., "error": "..."}`.

**What we'd gain**: Clean separation for any new MCP servers. Protocol routing separate from tool implementation. Deterministic error handling.

---

### Pattern 8: Context Priming (`/prime`)

**Source**: `claude-code-hooks-mastery`

Front-loads into Claude's memory before any task:
- Git status and recent commits
- Project structure (existing skills/agents/commands)
- Recent issues/errors from logs
- Environment state

Combined with `SessionStart` hook for automatic warm start every session.

**What we'd gain**: Prevents agents from duplicating existing skills or using stale naming conventions. Especially valuable for our prompt-engineer.

---

### Pattern 9: Damage Control with `patterns.yaml`

**Source**: `claude-code-damage-control`

Three protection tiers configured in YAML:
- **zeroAccessPaths**: No access at all (SSH keys, AWS creds, `.env`)
- **readOnlyPaths**: Read only (`/etc/`, `.bashrc`)
- **noDeletePaths**: Can read/write but never delete

Hook scripts check against patterns and return exit code 2 to block.

**What we'd gain**: Config-driven path protection. Drop the `.claude/` directory into any project for instant security.

---

### Pattern 10: Four-Layer Composable Architecture

**Source**: `bowser`

```
Skill (raw capability, CLI/MCP)
  └── Subagent (isolated parallel worker wrapping skill)
       └── Command (discovers tasks, fans out to subagents)
            └── Justfile (single one-liner entry point)
```

Each layer independently testable. Named sessions prevent state collision during parallel execution.

**What we'd gain**: We already have Skills, Agents, Commands — but formalizing independent testability per layer and adding entry-point scripts would improve reliability.

---

### Pattern 11: Shared Filesystem as Message Bus

**Source**: `big-3-super-agent`

Heterogeneous agents (Claude, Gemini, voice) converge on a shared workspace directory. No direct inter-agent API calls. Registry files track active sessions. Agents coordinate by reading/writing files.

**What we'd gain**: For co-located agents, filesystem coordination is lower overhead than P2P HTTP. Could define a `workspace/<agent>/task.json` + `result.json` convention.

---

### Pattern 12: UV Single-File Scripts

**Source**: `single-file-agents`, `hooks-mastery`

Every hook and agent uses `uv run` with inline dependency declarations:
```python
# /// script
# requires-python = ">=3.11"
# dependencies = ["pydantic>=2.0"]
# ///
```

Zero virtualenv management. Instant execution. Each file is independently runnable.

**What we'd gain**: Our hook scripts could adopt this for Python-based hooks — no setup, just `uv run hook.py`.

---

## Prioritized Integration Plan

### Quick Wins (1-2 hours each)

| # | Action | Source Pattern | Impact |
|---|--------|---------------|--------|
| 1 | Add PreToolUse hook to validate SKILL.md frontmatter on Write | Hook exit codes | Prevents malformed skills |
| 2 | Add schema/format spec to agent prompts before asking them to produce output | Schema-first injection | Better first-pass quality |
| 3 | Add iteration caps (default 10) to agent loops | Compute loop pattern | Prevents runaway generation |
| 4 | Add `--json` flag support to skill scripts | Atoms/beyond-mcp | Machine-parseable output |
| 5 | Use `Path(__file__).resolve()` in all skill scripts | beyond-mcp | Works regardless of CWD |

### Medium Effort (half-day each)

| # | Action | Source Pattern | Impact |
|---|--------|---------------|--------|
| 6 | Create `/prime` command for bopen-tools context warm-up | Context priming | Faster agent orientation |
| 7 | Add plan/build split to prompt-engineer workflow | Plan/Build split | Reduces thrashing |
| 8 | Implement wave management in dispatching-parallel-agents | Wave fan-out | Context budget awareness |
| 9 | Add `patterns.yaml` config to damage control hooks | Tiered path protection | Config-driven security |
| 10 | Add SubagentStart/Stop hooks logging to SQLite | Observability | Agent activity tracking |

### Bigger Lifts (1-2 days each)

| # | Action | Source Pattern | Impact |
|---|--------|---------------|--------|
| 11 | Build observability dashboard (Bun + SQLite + WebSocket) | Full observability | Real-time agent monitoring |
| 12 | Implement CEO & Board consensus skill | Multi-model consensus | Better high-stakes decisions |
| 13 | Formalize builder/validator agent pairing with hook enforcement | Builder/Validator | Reliable quality gates |

---

## Key Files Worth Studying

These are publicly readable and contain the most actionable patterns:

- `disler/claude-code-hooks-mastery/.claude/commands/plan_w_team.md` — Planning template with required sections
- `disler/claude-code-hooks-mastery/.claude/commands/cook.md` — Multi-step parallel task orchestration
- `disler/claude-code-hooks-mastery/.claude/agents/meta-agent.md` — Self-referential agent creator
- `disler/claude-code-hooks-mastery/.claude/agents/work-completion-summary.md` — End-of-session summary
- `disler/infinite-agentic-loop/.claude/commands/infinite.md` — Wave orchestration command
- `disler/bowser/.claude/commands/` — HOP/LOP decomposition examples
- `disler/aider-mcp-server/src/aider_mcp_server/atoms/` — Atoms architecture reference
- `disler/beyond-mcp/` — Context cost analysis with working examples of all 4 patterns
- `disler/claude-code-damage-control/.claude/hooks/` — Path protection hook scripts

---

## Philosophy Alignment

disler's core principles map well to ours:

| His Principle | Our Equivalent |
|--------------|----------------|
| "Prompts are the new fundamental unit of programming" | Skills as first-class, versioned, publishable units |
| "Agent > Code > Manual Input" | Agent-first architecture with ClawNet bots |
| "Skills enable progressive context disclosure" | SKILL.md format with references/ for depth |
| "Context window is a first-class design constraint" | Skills-over-MCP approach |
| "Process isolation > shared context" | Subagent isolation with dedicated tool access |
| "Hooks are your control plane" | Hooks directory in plugin structure |

---

## Source-Level Analysis (from actual repo files)

### hooks-mastery `.claude/` Directory Map

```
.claude/
├── settings.json               # All 13 lifecycle hooks registered
├── agents/
│   ├── hello-world-agent.md    # Minimal greeting agent
│   ├── llm-ai-agents-and-eng-research.md  # Temporal-anchored research
│   ├── meta-agent.md           # Agent that generates agents (model: opus)
│   └── work-completion-summary.md  # TTS audio summary via ElevenLabs
├── commands/
│   ├── build.md                # Execute a plan file
│   ├── cook.md                 # 7-agent parallel executor
│   ├── cook_research_only.md   # 5-coin research variant
│   ├── crypto_research.md      # 12-agent orchestrator (4 categories × 3)
│   ├── plan.md                 # Spec generator → specs/
│   ├── plan_w_team.md          # 14 KB multi-agent planning (largest file)
│   ├── prime.md                # Session onboarding (git ls-files + doc reads)
│   ├── prime_tts.md            # Prime + TTS announcement
│   ├── question.md             # Read-only Q&A (allowed-tools scoped)
│   ├── sentient.md             # TTS on/off toggle
│   └── update_status_line.md   # Session key-value store → status bar
├── hooks/
│   ├── setup.py                # Dep detection, project info → additionalContext
│   ├── session_start.py        # CONTEXT.md + TODO.md + git branch + GH issues
│   ├── session_end.py          # Symmetric logging
│   ├── pre_tool_use.py         # Block rm -rf, .env access (exit 2)
│   ├── post_tool_use.py        # Audit logging
│   ├── post_tool_use_failure.py
│   ├── pre_compact.py          # Pre-compaction state snapshot
│   ├── stop.py                 # TTS completion + transcript → chat.json
│   ├── subagent_start.py       # Logging
│   ├── subagent_stop.py        # Lock-managed TTS per subagent
│   ├── notification.py
│   ├── permission_request.py   # Auto-allow read-only, deny/allow decisions
│   └── user_prompt_submit.py   # Validate, log, auto-agent naming via LLM
└── status_lines/
    └── status_line_v6.py       # Custom status bar via uv run
```

### Hook Output Protocol

```
Exit 0  → pass through, stdout in transcript
Exit 1  → log warning, continue
Exit 2  → BLOCK tool call, stderr fed to Claude as error
JSON stdout with hookSpecificOutput.additionalContext → inject into Claude context
JSON stdout with hookSpecificOutput.decision.behavior = "allow"|"deny" → PermissionRequest
```

### `meta-agent.md` — Agent That Creates Agents

```yaml
name: meta-agent
model: opus
tools: Write, WebFetch, mcp__firecrawl, MultiEdit
color: cyan
```

10-step process — step 1 is **scrape live Claude Code docs** before writing any agent file. Output is a fenced code block (not direct file write) so human reviews before saving.

### `cook.md` — Verbatim Parallel Execution

7 sub-agents with different roles. Key discipline: orchestrator **must NOT modify sub-agent output**. Results written to `outputs/<timestamp>/` with no summarization. Preserves provenance.

### `question.md` — Read-Only Mode via Frontmatter

```yaml
allowed-tools: Bash(git ls-files:*), Read
```

Enforces read-only at command level. No Write, Edit, or general Bash access.

### `prime.md` — Context Warm-Up

Runs `git ls-files`, reads README.md + local `ai_docs/` directory (snapshotted Claude Code docs). No network dependency. Combined with SessionStart hook for automatic warm start.

### damage-control `patterns.yaml` — 100+ Destructive Patterns

Three tiers:
- **zeroAccessPaths**: `.env*`, `~/.ssh/`, `~/.aws/`, `*.pem`, `*.tfstate`
- **readOnlyPaths**: system dirs, shell configs, all lock files, build artifacts
- **noDeletePaths**: `~/.claude/`, README.md, LICENSE, .git/, Dockerfile

Covers: AWS (9 patterns), GCP (7), Firebase (5), Vercel (3), Netlify, Cloudflare, Docker, K8s, Helm, Redis, MongoDB, PostgreSQL, MySQL, Terraform, Pulumi, Heroku, Fly.io, DigitalOcean, Supabase, GitHub CLI, npm unpublish, SQL (DELETE without WHERE, TRUNCATE, DROP).

`ask: true` flag on individual patterns triggers confirmation dialog instead of hard block.

### `settings.json` Hook Registration

All hooks use `uv run $CLAUDE_PROJECT_DIR/.claude/hooks/<script>.py` for portability. UserPromptSubmit hook accepts flags: `--log-only --store-last-prompt --name-agent`.

### Patterns We Don't Currently Use

| Pattern | What It Does |
|---------|-------------|
| `additionalContext` injection via hook JSON | Inject git state, TODOs, GH issues into Claude at session start |
| `ask: true` in damage patterns | Confirmation dialog (not hard block) for ambiguous operations |
| Verbatim sub-agent output rule | Orchestrator preserves agent output without modification |
| `date` command as step 1 in research agents | Temporal anchoring prevents stale data |
| Trigger phrase routing in agent description | Description doubles as invocation router |
| Status line key-value store | Arbitrary session metadata surfaced in status bar |
| Auto-agent naming via LLM | Names sessions from first prompt using Ollama/Anthropic |
| `allowed-tools` scoping per command | Enforces read-only mode via frontmatter |
| Lock files for multi-agent TTS | Prevents simultaneous audio from parallel agents |
| Transcript → chat.json on session end | Structured log output for review |

---

## Meta-Prompting Strategies

### Four Levels of Meta-Prompting

1. **Conductor pattern** — single LLM decomposes task, spawns independent expert instances, synthesizes outputs (Stanford/OpenAI, +17.1% over standard prompting)
2. **Self-Refine loop** — GENERATE → FEEDBACK → REFINE cycle (~20% improvement, 40% for structural errors)
3. **Agent-creator agents** — agents whose job is creating other agents (disler's meta-agent, our prompt-engineer)
4. **Systematic prompt versioning/testing** — prompts as first-class versioned artifacts with evals

### The Stanford Meta-Prompting Framework

Conductor system prompt spawns `<expert-call>` instructions with role, specific question, and required output format. Experts are truly independent calls (fresh context, no shared state). The conductor synthesizes without revealing its reasoning to experts.

**Key insight**: Experts never see each other's work. This prevents groupthink and produces genuinely independent perspectives — directly applicable to our parallel subagent dispatch.

### Self-Refine Pattern

```
initial = llm(task)
feedback = llm("Review against criteria: {criteria}. Output: {initial}. Say STOP if good.")
if "STOP" not in feedback:
    refined = llm("Task: {task}. Previous: {initial}. Feedback: {feedback}. Improve.")
```

**Known failure**: Self-bias — LLMs overrate their own output. Fix: use stronger model as judge, or rubric-anchored assertions.

### Constitutional Prompt Critique

Apply a quality constitution during creation (not just after):

```markdown
## Agent Quality Constitution
- [ ] description triggers automatically (contains "when", "for", "proactively")
- [ ] tools list is minimal (least privilege)
- [ ] clear boundary statement ("I don't handle X, use Y agent")
- [ ] output format defined
- [ ] concrete invocation example in instructions
- [ ] model choice justified (haiku=fast, sonnet=default, opus=reasoning)
- [ ] no overlap with existing agents (check roster first)
```

### Prompt Composition Patterns

| Pattern | Use Case |
|---------|----------|
| Sequential chain | Extraction → transformation → formatting |
| Parallel fan-out/fan-in | Multi-perspective analysis (our subagent dispatch) |
| Conditional branching | Triage, intent routing (our front-desk) |
| Saga pattern | Multi-step workflows with rollback |
| Refinement loop | Self-refine, iterative improvement |

### High-Order Prompts (HOPs)

- **First-order**: Directly instructs action ("Summarize this document")
- **Second-order / meta-prompt**: Generates another prompt ("Write a prompt that summarizes for financial analysts")
- **Third-order**: Generates meta-prompts ("Write a meta-prompt that creates domain-specific summarizers")

Our `skill-creator` operates at third order — it generates skill prompt infrastructure given a workflow description.

### disler's Meta-Agent Pattern

`meta-agent.md` (model: opus, tools: Write, WebFetch, mcp__firecrawl, MultiEdit):
1. **Step 0**: Fetch live Claude Code docs before generating (prevents stale frontmatter)
2. Ask clarifying questions
3. Determine minimum tool set
4. Plan step-by-step instructions
5. Write domain best practices
6. Output as fenced code block (human reviews before saving)

**What it lacks vs our system**: No benchmark/eval step, no version management, no cross-reference against existing agents, no Skill() syntax knowledge.

### disler's Meta-Prompt Generator (`single-file-agents`)

CLI that generates structured XML prompts from 5-component spec: purpose, instructions, sections, examples, variables. Uses `o3-mini` with `reasoning_effort: "high"` — treating prompt generation as reasoning-intensive. Includes 4 worked examples (few-shot meta-prompting).

### State of the Art Frameworks (2025-2026)

| Framework | What It Does |
|-----------|-------------|
| **DSPy** (Stanford) | Declarative prompt optimization, prompts as learnable parameters |
| **PromptWizard** (Microsoft) | Self-evolving prompts + examples, LLM critiques own instructions |
| **TextGrad** | Natural language "gradients" for prompt optimization (Nature 2025) |
| **AutoPrompt** | Intent-based prompt calibration with eval loop |
| **promptfoo** | Cross-model prompt evaluation (YAML config, side-by-side matrix) |

### Gaps in Our System

| Gap | Recommendation |
|-----|---------------|
| No doc-fetch step in prompt-engineer | Add step 0: fetch current Claude Code docs before generating agents/skills |
| No quality constitution for creation | Create `references/agent-constitution.md` with binary checklist |
| No cross-reference during creation | `ls agents/` check before creating — prevent duplicates |
| No multi-model prompt testing | Integrate promptfoo for cross-model skill validation |
| No self-improving correction loop | Add correction-triggered update to `tasks/lessons.md` in CLAUDE.md |

### Quick Reference: Meta-Prompting Tool Selection

| Need | Tool/Pattern |
|------|-------------|
| Generate new agent from description | Meta-agent (step 0: fetch docs) |
| Improve existing prompt | Anthropic 4-step prompt improver |
| Self-critique against standards | CAI constitutional critique loop |
| Iterative refinement | Self-Refine (generate → feedback → refine) |
| Systematic optimization with metrics | DSPy MIPRO or PromptWizard |
| Cross-model comparison | promptfoo YAML config |
| Skill effectiveness measurement | Our benchmark-skills harness |
| Persistent improvement | lessons.md self-update pattern |
| Complex multi-expert decomposition | Stanford conductor pattern |
