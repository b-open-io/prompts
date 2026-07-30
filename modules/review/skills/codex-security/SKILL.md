---
name: codex-security
description: "Run OpenAI's agentic security scanner, `@openai/codex-security`, over a repository, PR, commit, branch diff, or working tree — then read, triage, export, and gate on its findings. Use this skill whenever the user asks to 'run a codex security scan', 'deep scan this repo for vulnerabilities', 'security review this PR with the OpenAI scanner', 'export findings as SARIF', 'compare this scan to the last one', 'mark that finding a false positive', 'gate CI on high-severity findings', or mentions codex-security, `npx @openai/codex-security`, or an AI security scan that validates findings and traces attack paths. Also use it when a grep- or pattern-level sweep (code-audit-scripts, semgrep) has come back thin and the user wants a real vulnerability hunt with reachability analysis. Do not use it for dependency CVE audits, secret scanning, or license checks — those are `bun audit` and `code-audit-scripts` work."
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

Reach for the cheapest tool that can answer the question. Escalate when it
can't.

| Tool | Cost | Finds |
|---|---|---|
| `Skill(code-audit-scripts)`, `bun audit` | free, seconds | Secrets, debug artifacts, known CVEs, TODOs |
| `Skill(semgrep)`, `Skill(codeql)` | free, minutes | Known patterns, taint flows expressible as rules |
| **`codex-security`** | paid, minutes to hours | Reachable logic flaws, auth/authz gaps, validated findings with attack paths and severity |

A thin pattern sweep is the normal reason to escalate here. Running this first
on a repo nobody has grepped yet wastes money on findings a free scan would
have caught.

## Before the first scan

Confirm three things with the user, once per engagement, and say what you are
about to do:

1. **Authorization.** The repository must be one they own or are authorized to
   assess. The scanner has no separate identity — it inherits the operator's
   filesystem access and runs with `approvalPolicy: "never"`, so it never stops
   to ask.
2. **Data flow.** Source contents go to OpenAI. Say so plainly for anything not
   already public.
3. **Budget.** Always pass `--max-cost USD`. A scan without a ceiling can run up
   real money on a large repository, and partial results are preserved when the
   ceiling stops it.

Two hygiene rules that are easy to get wrong and expensive to discover late:
results must be written **outside** the scanned repository and any enclosing Git
worktree (the CLI rejects an inside path), and subprocesses inherit the whole
environment — start scans from a shell that holds only the credentials this work
needs, not a session loaded with production tokens.

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

- Running scans, triaging output, and reporting posture — this skill, security-ops.
- Fixing a confirmed code-level finding — hand it to code-auditor with the
  finding's attack path attached, or use the CLI's own `patch` subcommand for a
  minimal verified change.
- Wiring scans into pipelines — devops owns the pipeline; see
  `references/sdk-and-automation.md` for the CI contract and pre-commit hook.

## References

- `references/cli-reference.md` — every command and flag, environment variables,
  runtime and deep-scan configuration, auth precedence, scan history, bulk-scan.
  Read when a command above doesn't cover the request.
- `references/sdk-and-automation.md` — TypeScript SDK surface, CI gating,
  `install-hook`, SARIF into code scanning, fleet-wide `bulk-scan`. Read when
  building automation rather than running a one-off scan.
