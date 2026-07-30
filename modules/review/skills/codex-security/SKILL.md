---
name: codex-security
description: "Run OpenAI's agentic security scanner (`@openai/codex-security`) over a repo, PR, or diff, then triage, patch, and gate on its findings. Use for 'run a codex security scan', 'find vulnerabilities in this PR', 'export findings as SARIF', 'fix that security finding', 'compare this scan to the last one', or when a pattern sweep came back thin. Not for dependency CVEs, secrets, or licenses (code-audit-scripts, bun audit)."
user-invocable: true
allowed-tools:
  - Bash
  - Read
---

# Codex Security

`@openai/codex-security` is OpenAI's agentic security scanner: a CLI plus
TypeScript SDK that discovers candidate vulnerabilities, validates them against
the code, traces each one from source to sink, calibrates severity, and writes
canonical JSON artifacts plus a human report. It is a different class of tool
from a pattern scanner — it reasons about reachability, so it finds logic-level
bugs a rule can't express and discards plausible-looking ones a rule would
report.

That power has a price, literally. Every scan spends model tokens, ships
repository contents to OpenAI, and runs with the operator's full local
permissions. Treat starting one as an action with consequences, not a lookup.

## Where it sits among the sweeps

Each tool answers a different question. Run them in this order because the cheap
ones finish first, not because the expensive one needs earning.

| Tool | Cost | Answers |
|---|---|---|
| `Skill(code-audit-scripts)`, `bun audit` | free, seconds | Are there secrets, debug artifacts, known CVEs, TODOs? |
| `Skill(semgrep)`, `Skill(codeql)` | free, minutes | Does any known-bad pattern or rule-expressible taint flow appear? |
| **`codex-security`** | paid, minutes to hours | Is there a *reachable* vulnerability — authz gap, IDOR, logic bypass — and how would it be exploited? |

Only the third question needs reasoning about the code's intent, which is why
nothing cheaper substitutes for it. A clean pattern sweep on code you don't yet
trust is a reason to run this, not a reason to stop.

## Before the first scan

Once per engagement, confirm the repo is one the user owns or is authorized to
assess, and say plainly that source contents go to OpenAI. The scanner has no
separate identity — it inherits the operator's filesystem access and runs with
`approvalPolicy: "never"`, so it never stops to ask on its own behalf.

Then three mechanics that are cheap to get right and expensive to discover late:
pass `--max-cost` on every invocation (partial results survive the ceiling),
write results **outside** the repository and any enclosing worktree (the CLI
rejects an inside path), and start from a shell holding only the credentials
this work needs — subprocesses inherit the whole environment.

## Preflight

Run this before proposing a command. It reports the harness, the resolved CLI,
interpreter versions, whether credentials are present, and a safe output
directory — without installing anything or touching the network:

```bash
bash <skill-path>/scripts/preflight.sh [repo-path]
```

It emits JSON. If `cli.command` comes back as the `npx` form, installing the
package first is worth mentioning: `npx` will download it on the first run.

Requirements it checks: Node.js 22.13+ (22.x), 24.x, or 26.x; Python 3.10+
(with `tomli` on 3.10). Auth is either `npx @openai/codex-security login`
(ChatGPT sign-in) or `OPENAI_API_KEY` / `CODEX_API_KEY` for CI. When both a
sign-in and an API key exist, an interactive scan asks which to use — pass
`--auth chatgpt` or `--auth api-key` to decide it up front.

## The commands worth memorizing

```bash
# Whole repository, report-only, with a spend ceiling
npx @openai/codex-security scan . --max-cost 5

# Scope to the code that matters — cheaper and sharper than a full sweep
npx @openai/codex-security scan . --path src/auth --path src/api --max-cost 3

# Review a change rather than a codebase
npx @openai/codex-security scan . --diff origin/main --max-cost 3
npx @openai/codex-security scan . --working-tree --max-cost 2

# Feed it the context a reviewer would have
npx @openai/codex-security scan . --knowledge-base docs/threat-model.md

# Exhaustive multi-pass discovery — reduces variance, costs proportionally more
npx @openai/codex-security scan . --mode deep --max-cost 20

# See the plan, the model, and the effort without spending anything
npx @openai/codex-security scan . --dry-run
```

Scans default to `gpt-5.6-sol` at `xhigh` reasoning effort. `--model` and
`--effort minimal|low|medium|high|xhigh` change that; drop the effort before you
drop the model when trimming cost.

Results land in `--output-dir` (required to be outside the repo). If that
directory already holds a prior scan, add `--archive-existing` rather than
letting the run fail.

After a scan:

```bash
npx @openai/codex-security scans list .                    # history for this checkout
npx @openai/codex-security scans show SCAN_ID              # config, results, coverage, artifacts
npx @openai/codex-security scans compare OLD_ID NEW_ID     # new / persisting / reopened / resolved
npx @openai/codex-security findings false-positive OCCURRENCE_ID --reason "..."
npx @openai/codex-security export RESULTS_DIR --export-format sarif --output results.sarif
```

`scans compare` is what makes this tool worth running twice. It matches findings
by root cause, so a re-scan after remediation tells you what actually closed
instead of handing you a fresh unordered list.

## Reading the output

Three canonical artifacts per scan, plus a generated `report.md`:

- `findings.json` — validated findings with severity, location, and attack path
- `coverage.json` — what was actually reviewed, and what wasn't
- `scan-manifest.json` — scan identity, mode, model, configuration

Read `coverage.json` before you report "all clear". An incomplete scan is not a
clean scan, and the difference is the whole finding. The CLI encodes this in its
exit codes:

| Exit | Meaning |
|---|---|
| `0` | Completed, no finding at or above `--fail-on-severity` |
| `1` | Completed, policy threshold breached |
| `2` | Incomplete coverage, or a CLI/runtime error — never a pass |

Progress and warnings go to stderr; structured results go to stdout, so `--json`
output stays pipeable.

When you translate findings into a report for the user, use the security posture
report format from the security-ops agent and keep the scanner's own severity
calibration — it was derived from the attack path, and downgrading it in the
retelling loses the reasoning.

## Closing a finding

Finding is half the job. The scanner also validates, patches, and proves
closure, so run the loop rather than handing the user a list:

```bash
# 1. Is it real? Re-check one finding on its own before spending effort on it.
npx @openai/codex-security validate FINDINGS_JSON "Missing authz in src/routes.ts:18"

# 2. Minimal repository-native fix that closes the boundary.
npx @openai/codex-security patch FINDINGS_JSON "Missing authz in src/routes.ts:18"

# 3. Prove it closed — re-scan the same scope, then compare by root cause.
npx @openai/codex-security scan . --path src/routes.ts --max-cost 2
npx @openai/codex-security scans compare "$BEFORE_ID" "$AFTER_ID"

# Not a bug? Record it, so the dismissal survives the next scan.
npx @openai/codex-security findings false-positive OCCURRENCE_ID --reason "..."
```

Step 3 is the one people skip, and it is the only step that produces evidence.
`scans compare` matches by root cause, so it distinguishes a finding that
actually closed from one that merely moved — and it reports **unknown** when the
new scan didn't review the original location. Unknown is a coverage gap, not a
fix; report it next to the resolved count or the trend line lies.

Review every patch before it lands. `patch` optimizes for the smallest change
that fully closes the boundary while preserving legitimate behavior, which is
the right objective but not a substitute for a human reading the diff. When the
fix needs design judgment rather than a boundary repair — the auth model is
wrong, not the check — that is code-auditor's work, and the finding's attack
path is what to hand over.

## Which harness you're in

The standalone CLI and SDK build their **own isolated Codex runtime and
`CODEX_HOME`**. They do not read the user's Codex configuration, and they do not
require the Codex CLI. So the commands above work identically from a Claude Code
session, a Codex session, or a Grok session — this is a shell-out lane, not a
harness feature.

Two things do depend on the host:

- **Deep-scan tuning.** The `[deep_scan]` block in
  `$CODEX_HOME/codex-security/config.toml` is read only when the bundled plugin
  runs inside an ordinary Codex host. A standalone `scan --mode deep` creates
  its own `CODEX_HOME` and therefore uses engine defaults, with no CLI flags to
  override them.
- **Plugin surface.** The package ships a Codex plugin directory
  (`_bundled_plugin`) whose skills — `security-scan`, `security-diff-scan`,
  `deep-security-scan`, `triage-finding`, `fix-finding`, `threat-model`,
  `attack-path-analysis`, and others — are what the CLI drives internally. A
  Codex session that has them loaded can invoke a phase directly; from Claude
  Code there is no equivalent, so drive the CLI and read the JSON. Upstream
  documents no marketplace install command for it, only `--plugin-path` for
  substituting a plugin directory or ZIP, so don't promise the user a native
  install you haven't confirmed on their machine.

Detect the host rather than assuming it. The markers, matching
`orchestra:visual-coordinator/scripts/detect-harness.sh`:

| Harness | Environment markers |
|---|---|
| Claude Code | `CLAUDECODE`, `CLAUDE_PLUGIN_ROOT` |
| Codex | `CODEX_HOME`, `CODEX_SANDBOX` |
| Grok | `GROK_SANDBOX`, `GROK_HOME` |

`scripts/preflight.sh` reports this alongside everything else. Note that a
running scan sets its own `CODEX_SECURITY_*` variables — those are runtime data,
not host signals, and reading them as such misreports any nested invocation.

## Boundaries

- Scanning, triage, the patch-and-verify loop, and posture reporting —
  security-ops owns all of it.
- A finding whose fix is a design change rather than a boundary repair —
  code-auditor, with the attack path attached.
- Wiring scans into pipelines — devops owns the pipeline; see
  `references/sdk-and-automation.md` for the CI contract and pre-commit hook.

## References

- `references/cli-reference.md` — every command and flag, environment variables,
  runtime and deep-scan configuration, auth precedence, scan history, bulk-scan.
  Read when a command above doesn't cover the request.
- `references/sdk-and-automation.md` — TypeScript SDK surface, CI gating,
  `install-hook`, SARIF into code scanning, fleet-wide `bulk-scan`. Read when
  building automation rather than running a one-off scan.
