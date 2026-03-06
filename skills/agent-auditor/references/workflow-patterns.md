# Workflow Patterns for Auditing

Patterns for structuring audit workflows, distilled from Anthropic's "Building effective agents" guidance and adapted for skill/agent auditing.

## Pattern 1: Sequential Audit Pipeline

**Use when:** Auditing a single plugin or a small set of skills.

```
Enumerate → Classify → Check → Report → Fix → Re-audit
```

Each step depends on the previous step's output. Do not parallelize -- the classification informs what checks to run, and the report informs what to fix.

**Steps:**
1. `ls skills/*/SKILL.md` -- enumerate all skills
2. Read each SKILL.md frontmatter, classify by type (agent-only, user-only, default)
3. Run six-dimension checklist against each skill
4. Generate audit report with pass/warn/fail per dimension
5. Apply fixes to failing skills
6. Re-run checks on fixed skills only

**Key techniques:**
- Explicit step ordering prevents skipping checks
- Fix step is separate from check step (don't fix while checking)
- Re-audit confirms fixes actually resolved the issue

## Pattern 2: Parallel Dispatch

**Use when:** Auditing multiple plugins simultaneously (bopen-tools, bsv-skills, gemskills, 1sat-skills, product-skills).

```
                    ┌── Agent: audit bopen-tools
                    ├── Agent: audit bsv-skills
Coordinator ────────├── Agent: audit gemskills
                    ├── Agent: audit 1sat-skills
                    └── Agent: audit product-skills
                              │
                              ▼
                    Coordinator merges reports
```

**How to dispatch:**
- One subagent per plugin
- Each subagent runs the Sequential Audit Pipeline independently
- Coordinator provides: plugin repo path, checklist criteria, report format
- Each subagent returns: structured audit report

**Key techniques:**
- Subagents are independent -- no cross-agent dependencies
- Coordinator provides thorough context since subagents lack conversation history
- Each subagent follows the same audit template for consistent output
- Coordinator merges into a single ecosystem-wide report

**Coordinator template for subagent prompt:**
```
Audit all skills in [plugin-path]/skills/.
For each skill:
1. Read SKILL.md frontmatter
2. Check invocation fields against the matrix
3. Evaluate description quality (trigger phrases, specificity, length)
4. Check structure (word count, references/, scripts/)
5. Check for evals/evals.json
6. Report findings as: skill-name | dimension | pass/warn/fail | notes
```

## Pattern 3: Evaluator-Optimizer Loop

**Use when:** Iteratively improving a skill after the audit identifies issues.

```
┌──────────────────────────────────┐
│                                  │
│   Generate fix → Evaluate fix ───┤
│        ▲              │          │
│        │         pass?│          │
│        │              │          │
│        └── no ────────┘          │
│                   │              │
│              yes: done           │
└──────────────────────────────────┘
```

**Steps:**
1. Take an audit finding (e.g., "description too vague")
2. Generate a fix (rewrite the description with specific triggers)
3. Evaluate the fix against the audit criterion
4. If it passes, move to the next finding
5. If it fails, generate a new fix incorporating what went wrong

**When to use vs not:**
- Use for description optimization, structural refactoring, instruction rewrites
- Don't use for simple fixes (adding a missing field, renaming a directory)
- Stop after 3 iterations -- if a fix isn't converging, the problem needs human input

## Pattern 4: Audit-Then-Benchmark

**Use when:** You want to verify that audit fixes actually improved skill effectiveness, not just structural compliance.

```
Audit → Fix → Benchmark (before) → Apply fixes → Benchmark (after) → Compare
```

1. Run structural audit, identify and fix issues
2. Run `bun run benchmark --skill [name]` to get baseline metrics
3. Apply the structural fixes (better description, reorganized content)
4. Re-run benchmark with identical evals
5. Compare pass_rate and baseline_pass_rate deltas

**Key metric:** If the delta (pass_rate - baseline_pass_rate) improved, the fix helped. If it stayed the same or worsened, the fix was cosmetic only.

## When to Use Agents vs Simple Workflows

| Scenario | Approach |
|----------|----------|
| Audit 1 plugin, <10 skills | Sequential pipeline, no subagents |
| Audit 1 plugin, 10+ skills | Sequential pipeline, consider subagent for fixes |
| Audit 2+ plugins | Parallel dispatch with subagents |
| Fix a single skill's description | Evaluator-optimizer loop, no subagent |
| Validate fixes improved quality | Audit-then-benchmark |
| Full ecosystem health check | Parallel dispatch + audit-then-benchmark |

Simple audits don't need full agent orchestration. Reserve subagents for parallelizable work (multiple plugins) or when you need to protect the main context window from reading dozens of SKILL.md files.
