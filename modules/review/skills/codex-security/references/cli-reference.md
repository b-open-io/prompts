# Codex Security CLI reference

Complete command, flag, and environment surface for `@openai/codex-security`.
Verified against the repository README at package version 0.1.14 (bundled
plugin). The authoritative upstream references are
<https://developers.openai.com/codex/security/cli> and
<https://github.com/openai/codex-security>.

Contents:

1. [Install and requirements](#1-install-and-requirements)
2. [Authentication](#2-authentication)
3. [scan](#3-scan)
4. [Runtime configuration and worker limits](#4-runtime-configuration-and-worker-limits)
5. [Deep-scan engine configuration](#5-deep-scan-engine-configuration)
6. [Scan history, matching, and reruns](#6-scan-history-matching-and-reruns)
7. [findings, validate, patch](#7-findings-validate-patch)
8. [export](#8-export)
9. [bulk-scan](#9-bulk-scan)
10. [install-hook](#10-install-hook)
11. [Environment variables](#11-environment-variables)
12. [Local security model](#12-local-security-model)

---

## 1. Install and requirements

```bash
npm install @openai/codex-security      # project-local
npx @openai/codex-security --version
npx @openai/codex-security info --json  # package, plugin, runtime, defaults
```

- macOS, Linux, Windows.
- Node.js 22.13.0+ within 22.x, or 24.x, or 26.x.
- Python 3.10+ for scanning and export. On 3.10, also install `tomli`.
- Interpreter resolution order: `--python` / SDK `pythonPath` → `PYTHON` →
  managed Codex runtime → `python3` or `python` on `PATH`.

Update notices are suppressed by `CODEX_SECURITY_NO_UPDATE_NOTICE=1`,
`NO_UPDATE_NOTIFIER`, `CI`, or a non-TTY stderr.

## 2. Authentication

```bash
npx @openai/codex-security login       # ChatGPT sign-in, local use
```

For CI, set `OPENAI_API_KEY` or `CODEX_API_KEY` instead. `OPENAI_API_KEY` wins
when both are present. Environment API keys are passed to the current scan only
— they are never written to the credential home or the system keyring.

Local sign-in honors Codex's configured credential backend, including a system
keyring on a managed device. When both a sign-in and an environment key exist,
interactive scans prompt; noninteractive scans keep API-key precedence. Force
the choice with `--auth chatgpt` or `--auth api-key`, or `unset OPENAI_API_KEY
CODEX_API_KEY` to make the sign-in the default.

Preflight reports the selected credential source before Codex starts, but
authentication and model authorization are only truly verified once a real scan
begins. Network failures and rate limits retry; definitive auth failures stop
immediately.

## 3. `scan`

```bash
npx @openai/codex-security scan <path> [flags]
```

| Flag | Effect |
|---|---|
| `--path PATH` (repeatable) | Scope the scan to one or more repository-relative paths |
| `--diff REF` | Scan committed changes against a ref (e.g. `origin/main`) |
| `--working-tree` | Scan staged and unstaged changes |
| `--mode standard\|deep` | Deep repeats discovery to reduce variance; supports repository and path targets, not diffs |
| `--model MODEL` | Default `gpt-5.6-sol`; e.g. `gpt-5.6-terra` |
| `--effort minimal\|low\|medium\|high\|xhigh` | Default `xhigh` |
| `--knowledge-base PATH` (repeatable) | Architecture docs, threat models, policies. Directories are searched recursively for Markdown, text, PDF, and `.docx` |
| `--output-dir DIR` | Artifact directory; must be outside the scanned directory and any enclosing Git worktree |
| `--archive-existing` | Move existing results to `<output-dir>.previous-<timestamp>-<id>` and start clean |
| `--max-cost USD` | Stop the scan and its workers once running cost exceeds the limit; partial results preserved, in-flight requests may finish above it |
| `--fail-on-severity LEVEL` | Exit 1 when a completed scan contains a finding at or above the level |
| `--json` | Structured result on stdout |
| `--dry-run` | Report effective model, effort, and destination without starting Codex or contacting the network |
| `--auth auto\|chatgpt\|api-key` | Credential selection |
| `--python PATH` | Interpreter override |
| `--codex KEY=VALUE` (repeatable) | Deep-merge TOML into the isolated Codex config |
| `--plugin-path PATH` | Use a plugin directory or ZIP instead of the bundled one |

On macOS/Linux an existing output directory must be private to the current user
(`chmod 700`). SARIF produced during a scan is written to
`<scan-dir>/exports/results.sarif`.

### Exit codes

| Code | Meaning |
|---|---|
| 0 | Completed; no finding at or above the `--fail-on-severity` threshold |
| 1 | Completed; threshold breached |
| 2 | Incomplete coverage, or CLI/runtime error |

Incomplete scans still write the available human or JSON result to stdout and a
coverage warning to stderr, including in report-only mode. Exit 2 must never be
treated as a pass.

### Output streams and cost accounting

Progress and summaries go to stderr; structured results stay on stdout. Progress
identifies requested paths and reports ranking, file-review, validation, and
attack-path phases as they become available. Completion summarizes findings,
severity, coverage, elapsed time, token and worker counts, estimated cost,
results directory, and the next useful command.

Every scan records model, tokens, and estimated cost in its JSON result, scan
history, and bulk-scan receipt. Estimates use standard API token prices
including cached input and cache writes; fees and surcharges are excluded.

## 4. Runtime configuration and worker limits

The standalone CLI and SDK do **not** load the user's or repository's Codex
configuration. Each scan starts a private runtime with these defaults:

```toml
cli_auth_credentials_store = "file"
model = "gpt-5.6-sol"
model_reasoning_effort = "xhigh"

[features]
plugins = true
goals = true

[features.multi_agent_v2]
enabled = true
max_concurrent_threads_per_session = 9

[windows]
sandbox = "unelevated"
```

`--codex KEY=VALUE` deep-merges into that isolated config:

```bash
npx @openai/codex-security scan . \
  --model gpt-5.6-terra --effort high \
  --codex features.multi_agent_v2.max_concurrent_threads_per_session=4
```

Rules that will otherwise bite:

- The thread limit **includes the parent agent** — the default 9 gives up to 8
  delegated workers. A configured limit is a maximum, not proof workers started.
- Separate from `bulk-scan --workers`, which controls concurrent repositories.
- Quote strings as TOML: `--codex 'model_reasoning_effort="high"'`.
- Do not pass both `--model` and `--codex 'model="..."'` (same for effort);
  conflicting or repeated keys are rejected.
- Overrides of `plugins`, `marketplaces`, or `features.plugins` — including
  profile-specific plugin overrides — are rejected. Use `--plugin-path`.
- Native multi-agent v2 must stay enabled. Legacy `agents.max_threads` and
  `features.multi_agent_v2.enabled=false` are rejected.
- `validate` and `patch` accept `--effort` and only the `model` /
  `model_reasoning_effort` `--codex` keys.
- Overrides never change approval policy or filesystem permissions.

## 5. Deep-scan engine configuration

When the bundled plugin runs inside a normal Codex host, its repeated-discovery
engine reads `$CODEX_HOME/codex-security/config.toml` (default
`~/.codex/codex-security/config.toml`):

```toml
[deep_scan]
workers = "auto"          # half available parallelism, min 1, max 6
subagents = 3             # nonnegative integer
stop_after_no_new = 6     # positive integer
max_discovery_runs = 60   # positive integer
```

Unknown `[deep_scan]` keys are rejected. Because standalone CLI and SDK scans
create an isolated `CODEX_HOME`, they do **not** import this file: `scan --mode
deep` uses the engine defaults and there are no standalone flags for these four
settings. `--codex` adjusts the Codex session thread limit, not `[deep_scan]`.

## 6. Scan history, matching, and reruns

```bash
npx @openai/codex-security scans list [repo-path]
npx @openai/codex-security scans list --scan-root DIR
npx @openai/codex-security scans show SCAN_ID [--show-linked-findings]
npx @openai/codex-security scans rerun SCAN_ID
npx @openai/codex-security scans match OLD_ID NEW_ID
npx @openai/codex-security scans match --all
npx @openai/codex-security scans compare OLD_ID NEW_ID
```

Any scan ID may be given as a unique prefix of at least eight characters.

`scans compare` matches findings by root cause, reuses saved matches, and
classifies each as new, persisting, reopened, resolved, or unknown. A finding
stays **unknown** when coverage was incomplete or its original location was not
reviewed — that is a coverage gap, not a resolution.

History lives in the workbench database at
`$CODEX_HOME/state/plugins/codex-security/workbench.sqlite3`. Override the
private state, workbench, and default artifact directory with
`CODEX_SECURITY_STATE_DIR`, which takes precedence over `CODEX_HOME`. Keep both
state and results outside the scanned repository.

## 7. `findings`, `validate`, `patch`

```bash
npx @openai/codex-security findings false-positive OCCURRENCE_ID \
  --reason "The route already checks permissions"

npx @openai/codex-security validate FINDINGS_JSON "Possible SQL injection in src/query.ts:42"
npx @openai/codex-security validate "Possible SQL injection" --effort high

npx @openai/codex-security patch FINDINGS_JSON "Missing authorization check in src/routes.ts:18"
npx @openai/codex-security patch "Missing authorization check" --effort high
```

`validate` re-checks whether a finding is real. `patch` produces a minimal
repository-native change that closes the boundary while preserving legitimate
behavior — minimal meaning smallest change that fully closes it, not fewest
lines. Both accept `--effort` and only the two model-related `--codex` keys.

Record false positives rather than deleting findings: the reason is stored and
carried into later `scans compare` runs.

## 8. `export`

```bash
npx @openai/codex-security export RESULTS_DIR --export-format sarif --output results.sarif
npx @openai/codex-security export RESULTS_DIR --export-format csv  --output findings.csv
npx @openai/codex-security export RESULTS_DIR --export-format json --output findings.json
```

Write exports outside the repository. Results can contain source excerpts,
vulnerability detail, and reproduction steps — restrict access to authorized
reviewers.

## 9. `bulk-scan`

```bash
npx @openai/codex-security bulk-scan
npx @openai/codex-security bulk-scan --model gpt-5.6-terra --effort high
npx @openai/codex-security bulk-scan repositories.csv \
  --output-dir /path/outside/repos/security-scans --workers 4 --max-attempts 2
```

Interactive discovery: sign in with `gh auth login`, then `bulk-scan` lists
GitHub repositories pushed in the last 90 days, excluding archived repos and
forks. Search, select, confirm. Private checkouts reuse the GitHub CLI sign-in
without modifying global Git config. Selections are saved to
`<output-dir>/repositories.csv` for review or resumption.

CSV input requires `id`, `repository`, and `revision` (full commit hashes);
optional `scope` and `mode` narrow individual scans:

```csv
id,repository,revision,scope,mode
service,https://github.com/acme/service.git,0123456789abcdef0123456789abcdef01234567,src,standard
```

`--workers` limits concurrent scans, `--max-attempts` retries failures, and
rerunning the same command resumes.

## 10. `install-hook`

```bash
npx @openai/codex-security install-hook [--fail-on-severity LEVEL]
```

Installs a pre-commit hook that scans staged and unstaged changes. It respects
`core.hooksPath`, refuses to replace an existing hook, and blocks high-severity
findings or failed scans by default.

## 11. Environment variables

User-configurable:

| Variable | Effect |
|---|---|
| `OPENAI_API_KEY`, `CODEX_API_KEY` | Scan authentication; `OPENAI_API_KEY` wins |
| `CODEX_SECURITY_STATE_DIR` | Override scan-history, workbench, and default artifact directory |
| `CODEX_HOME` | Ambient Codex home for file-backed sign-in and default state; defaults to `~/.codex` |
| `PYTHON` | Interpreter when `--python` / `pythonPath` is unset |
| `GH_HOST` | GitHub Enterprise host for interactive `bulk-scan` discovery |
| `CODEX_SECURITY_NO_UPDATE_NOTICE`, `NO_UPDATE_NOTIFIER` | Disable update notices |
| `CODEX_SECURITY_NPM_REGISTRY`, `npm_config_registry`, `NPM_CONFIG_REGISTRY` | Update-check registry, in that precedence |
| `CI` | Disable interactive update notices |
| `NO_COLOR`, `TERM` | Disable colored history output (`NO_COLOR` set, or `TERM=dumb`) |

Docker Compose workflow only: `CODEX_SECURITY_IMAGE`, `CODEX_SECURITY_USER`,
`CODEX_SECURITY_SECCOMP`, `CODEX_SECURITY_CSV`, `CODEX_SECURITY_RESULTS`,
`CODEX_SECURITY_STATE`, plus `GH_TOKEN` / `GITHUB_TOKEN` for private checkouts
and `CODEX_SECURITY_GIT_HOST` for GitHub Enterprise in the container. These are
distinct from standalone CLI flags and from discovery's `GH_HOST`.

**Not** user configuration — generated by an active scan, and therefore useless
as host-detection signals: `CODEX_SECURITY_SCAN_ID`, `CODEX_SECURITY_SCAN_DIR`,
`CODEX_SECURITY_PLUGIN_ROOT`, `CODEX_SECURITY_CONFIG_PATH`,
`CODEX_SECURITY_TARGET_PATHS_FILE`.

## 12. Local security model

Codex Security runs with local operating-system permissions. Scan only
repositories you trust and either own or are authorized to assess. The
repository, the Git installation, configured tools, and other scans under the
same account are **not** separate security principals.

Every scan uses the `codex_security_scan` filesystem profile and
`approvalPolicy: "never"`. It reads the local filesystem and writes to workspace
roots and the selected state directory, without interactive approval. Setting
`approval_policy`, `sandbox_mode`, or permissions through `--codex` or SDK
`codexOverrides` does not replace or tighten these controls; independently
enforced host and network restrictions still apply.

Scan and workbench subprocesses inherit the environment, including unrelated API
tokens and cloud credentials. Start a scan with only the credentials it needs.

The scanner is expected to stay within the authorized target and output paths,
avoid disclosing private data beyond the requested operation, and report scan
mode, reviewed files, and exclusions accurately. Report suspected violations
through the upstream security policy at
<https://github.com/openai/codex-security/blob/main/SECURITY.md>.
