# Cross-harness audit — 2026-09-05

Scope: read-only review of `/Users/satchmo/code/worktrees/prompts-factory-worker` at `6ba4688fd4138c7a7a4de4f0ed3a184a7e36fb76`. Paths below are relative to that root. Read AGENTS.md, plugin-dev skill-development, ponytail, and the complete plugin-context-reduction blog source (bopen-ai/src/data/posts.ts:386–690). No paid model requests, installs, release changes, or source fixes. Static hypotheses are separated from deterministic reproductions.

## Prioritized findings

### H1 — P1: OpenCode silently disables the specialist skills that four least-privilege agents require

Evidence: `opencode/catalog.ts:77–82` maps source tool entries by exact dictionary lookup. `Skill(semgrep)` or `Skill(visual-review)` do not equal `Skill`, so they disappear, and the adapter writes `permission.skill = "deny"`. A source list with only `Bash(git:*)` similarly becomes `permission.bash = "deny"`.

Deterministic source-catalog probe using `loadCatalog(pluginRoots(process.cwd(), ["review", "dev-ops"]))` returned:

- code-auditor, security-ops, devops, payments: `skill: "deny"`.
- architecture-reviewer, consolidator: `bash: "deny"`.
- Adapter warnings: `[]`.

Affected source contracts: `modules/review/agents/code-auditor.md:29`, `security-ops.md:29`, `architecture-reviewer.md:26`, `consolidator.md:18`; `modules/dev-ops/agents/devops.md:36`, `payments.md:19`. The blog explicitly kept four specialized Skill allowlists to preserve least privilege; precisely those agents lose the Skill capability through this adapter.

Impact: e.g. a security audit cannot load its Semgrep/CodeQL/workflow skills; architecture review cannot run its scoped git/gh commands. This is a demonstrated generated-config defect; no live model execution was necessary. Current OpenCode docs confirm `deny` blocks actions and both bash and skill support input-matched rules: https://opencode.ai/docs/permissions/ (retrieved 2026-09-05).

Smallest opportunity: parse the supported scoped entries, preserve their restrictions without granting wider permissions than the user's settings, and emit an explicit compatibility error for entries that cannot be represented. Do not replace restricted Skill lists with unrestricted Skill just to make the symptom disappear. Verification: extend the existing catalog test with actual shipped frontmatter plus a fake-model/native smoke that loads an allowed skill, blocks a disallowed skill, and exercises allowed versus forbidden Bash commands.

### H2 — P1: routing evaluation can report green after a runtime failure or after discarding a failed host

Evidence: `scripts/evaluate-skill-routing.py:70` constructs a dictionary by case_id only; `host` does not participate in identity. `:85–114` ignores result.error. Deterministic reproductions:

1. Two records for case x: Codex error/no invocation, then Claude correct invocation → `passed=true`, `precision=1.0`, only Claude remains in per-case output. Reversing order changes the verdict.
2. Negative case with `error="timeout"`, no invoked skills → `passed=true`, `precision=1.0`.
3. Expected review:code-auditor plus unexpected creative:designer → `passed=true`, despite precision=0.5. `:132–135` has no precision/unexpected-invocation condition. This third case is a policy gap if over-routing is supposed to fail; currently only explicitly forbidden extras fail.

The doc (`docs/plugin-context-harness.md:155`) describes host-tagged results, but no duplicate-host guard or explicit single-host input validation exists. Existing tests exercise only one positive/negative result per case.

Smallest opportunity: reject duplicate case IDs unless the scorer explicitly supports a (case, host, run) key, fail invalid/error records, and define an explicit precision/extra-route gate. Add three fixtures above. Run scoring per host, preserve each run instead of silently overwriting it, and aggregate only after host completeness is verified.

### H3 — P2: published startup-weight gate is not wired to CI, and the optional release runner passes no limits

Evidence: `.github/workflows/dual-plugin-validation.yml:23–43` runs manifest/docs/generated-agent/install-safety/hooks/whitespace checks. The other workflows add extraction/isolation, native OpenCode checks, and promotion; none invokes `plugin-weight.py`, `run-plugin-harness.py`, or scripts/tests. `scripts/run-plugin-harness.py:85–88` calls plugin-weight without flags. All size/count/duplicate gates are opt-in (`scripts/plugin-weight.py:162–167`, `:183–230`), so that invocation is an inventory report with a green gate regardless of size growth.

The blog says the measurement became a gate and should be in CI. Today CI protects install mechanics substantially better than catalog cost or scorer correctness. This is proven workflow/configuration inspection, not a claim about branch protection settings on GitHub.

Smallest opportunity: call the existing weight script from validate with explicit reviewed budgets (core and full suite separately), and run relevant deterministic scripts/tests with Python 3.12 and declared dependencies. Do not invent another harness. Verification: one temporary fixture exceeding a budget must fail the same CI command; normal inventory should pass. Parent owns actual baseline counts/weights.

### H4 — P2: runtime-context recognizes only three environments and gives stale host capability advice

Evidence: `skills/runtime-context/SKILL.md:21–27` lists Claude Code, Vercel Sandbox, local dev; `scripts/detect.sh:15–24` cannot identify Codex/Grok/OpenCode. Running this detector from the current Codex task returned `runtime="local"`. It checks CLAUDE_CODE/CLAUDE_SESSION_ID but not CLAUDECODE. `SKILL.md:74–79` makes a blanket claim that Codex cannot display HTML and directs users to BitPlan; this session exposes native Codex file/browser opening and visualization support, so the unqualified platform statement is too broad.

The newer visual-coordinator detector already handles more host indicators and rosters (`modules/orchestra/skills/visual-coordinator/scripts/detect-harness.sh`), showing internal duplication/drift. The source document's sensible instruction not to guess tools is undermined by its hardcoded table.

Smallest opportunity: reuse current host-detection knowledge and distinguish host identity from actual exposed capabilities. Resolve file/HTML presentation from available app/browser tools; keep BitPlan as an optional workflow choice. Verification: env/tool fixtures for all four harnesses plus SDK-only/local/sandbox cases; unknown capabilities must remain unknown instead of being inferred from a host name.

### H5 — P2: the agent-routing probe is Claude-only and its isolation claim exceeds what its code isolates

Evidence: `scripts/run-agent-routing.py:53–78` copies the ambient environment, changes CLAUDE_CONFIG_DIR, then launches Claude with cwd equal to the plugin source tree. That tree carries CLAUDE.md/AGENTS instructions; source plugin hooks still explicitly consult HOME/.claude state (`hooks/session-context.sh:24`, `:92`, `:402`; `hooks/prompt-router.sh:80`). Changing CLAUDE_CONFIG_DIR alone does not isolate those hardcoded paths. The probe's own docstring says the model sees the catalog and nothing else, which is not established by this launch construction.

It measures a named selection rather than actual invocation (`:33–38`), records no host/model/runtime version in successful results, and only has a Claude command implementation. `run_case_repeated:135–156` drops errored samples; a single success plus two failures can report agreement=1.0 without any error field. These are static implementation observations, not fresh model measurements.

Smallest opportunity: use an isolated empty working directory and explicit hook/config inputs, preserve host/model/version/seed-equivalent/run metadata and errors, retain a selection test but label it honestly, and add a small true invocation suite per host. Prioritize the exact scoped-skill failure from H1, negative routes, adjacent role boundaries, and reference loading. Skill-auditor also independently found benchmark.tsx only discovers root skills and inherits baseline environment; incorporate that agent's primary evidence for the separate output-benchmark gap.

### H6 — P3: OpenCode runs SessionStart work on every user message; measure before caching

Evidence: `opencode/hooks.ts:199–200` awaits session-context, browser-intent, then prompt-router on each chat.message. Session-context gathers multiple git facts and status (`hooks/session-context.sh:306–340`), scans settings/cache, can scan cache directory mtimes, and creates JSON through additional Python processes. Claude/Codex/Grok invoke this on SessionStart instead. Static call-path evidence proves repeated work, not user-visible milliseconds or token impact.

Opportunity: measure p50/p95 warm/cold hook wall time, subprocess count and injected bytes on small/large repositories first. If significant, cache session-invariant settings/catalog context with precise invalidation while refreshing truly volatile branch/dirty data only when needed. SessionStart context is capped at 4,000 characters, so avoid implying unbounded injection. Preserve guards, which already consolidate Bash checks in one shell (`hooks/pretooluse-bash.sh:3–12`). No cache architecture is justified without the measurement.

## Checks actually run

- `bun test opencode skills/setup/scripts/emitter.test.ts skills/setup/playground/src/lib/pack-dependencies.test.ts`: **41 pass, 0 fail, 121 assertions**. Raw log `/tmp/harness-bun-tests.txt`.
- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/tests -p 'test_*.py' -q`: **43 tests, 3 errors** on local Python 3.11. Two visual-coordinator tests launch uninstalled vite/vitest (`bun run test/check:plugin`, exit 127); one extraction test uses tar.extractall(filter=...), unsupported in this local Python build. CI specifies Python 3.12. These are local environment/dependency limitations, not three proven product bugs. No dependencies installed to hide the limitation.
- Scorer import probes: all three false-green cases reproduced as described in H2.
- Native OpenCode source catalog probe: all six permission regressions above reproduced, no warnings.
- runtime-context detect.sh: returned local from current Codex task.
- No paid end-to-end benchmark, real native permission request, installation, or hook latency benchmark was run.

## Proposed measurable sequence

1. Repair measurement validity and OpenCode scoped-tool parity first; add cheap deterministic regression cases.
2. Wire reviewed startup budgets, catalog/reference checks and existing tests into dev CI. Keep model/API evals separate and bounded.
3. Compare unchanged baseline vs candidate catalog using identical installed modules and prompts on Claude, Codex, Grok, OpenCode: route precision/recall, expected reference load, task success, startup omissions, first-use context, total input/output/cache tokens, cost, tool attempts/errors, and wall-clock p50/p95. Run several samples and retain failed runs.
4. Optimize the highest measured contributor, preserving quoted coined terms and adjacent-role boundaries from the blog; rerun only affected routes plus core negatives and the full cheap CI tier.
5. Review dev evidence before the existing dev→production cooling/approval flow. Do not claim historical blog percentages as today's measured improvement.
