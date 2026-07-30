# Codex Security SDK and automation

Read this when building something that runs scans repeatedly — CI gating, a
pre-commit hook, a fleet sweep, or a service — rather than running a one-off
scan. For the command surface, see `cli-reference.md`.

Contents:

1. [TypeScript SDK](#1-typescript-sdk)
2. [CI gating contract](#2-ci-gating-contract)
3. [Pre-commit hook](#3-pre-commit-hook)
4. [SARIF into GitHub code scanning](#4-sarif-into-github-code-scanning)
5. [Fleet sweeps with bulk-scan](#5-fleet-sweeps-with-bulk-scan)
6. [Regression tracking across scans](#6-regression-tracking-across-scans)
7. [Cost control patterns](#7-cost-control-patterns)

---

## 1. TypeScript SDK

```ts
import { CodexSecurity } from "@openai/codex-security";

const security = new CodexSecurity();

try {
  const result = await security.run("/path/to/repository", {
    outputDir: "/path/outside/repository/results",
    maxCostUsd: 5,
  });

  console.log(result.reportPath);
  console.log(result.findings.findings.length);
} finally {
  await security.close();
}
```

Always `close()` in a `finally` — the client owns a runtime process.

### Constructor options

| Option | Description |
|---|---|
| `pluginPath` | Use a Codex Security plugin directory or ZIP instead of the bundled one |
| `pythonPath` | Interpreter, consulted before `PYTHON` |
| `codexOverrides` | Deep-merge supported settings into the isolated Codex configuration |

### `run(repository, options)` / `preflight(repository, options)`

| Option | Description |
|---|---|
| `auth` | `"auto"`, `"chatgpt"`, or `"api-key"` |
| `target` | Repository, repository-relative paths, committed diff, or working-tree diff |
| `mode` | `"standard"` or `"deep"`; deep supports repositories and paths |
| `knowledgeBasePaths` | Architecture docs, security policies, threat models, or directories |
| `outputDir` | Artifact directory outside the enclosing Git worktree |
| `archiveExisting` | Archive existing results before starting |
| `maxCostUsd` | Stop once estimated model cost exceeds a positive USD amount |
| `failureSeverity` | Record a finding-severity policy in the saved scan recipe |
| `parentScanId` | Link a rerun to an existing parent scan |
| `expectedPluginVersion` | Require the original plugin version when replaying a scan |
| `signal` | Cancel with an `AbortSignal` |

### Callbacks

`onAuthentication`, `onCost`, `onOutputArchived`, `onOutputDirReady`,
`onScanStarted`, `onReconnect`, `onWorkerStatus`, `onWarning`, `onObserverError`.

`onWorkerStatus` and `onReconnect` are what make a long scan observable — wire
them to your logger before shipping anything that runs unattended.

`preflight()` validates local inputs only. It does not start the runtime,
authenticate, resolve Python, inspect the plugin, or fire the scan-lifecycle
callbacks. Use it to fail fast on bad configuration without spending anything.

### Handling results

Results can contain source excerpts, vulnerability details, and reproduction
steps. Keep result directories and saved reports outside the repository and
limit access to authorized reviewers. Do not paste raw findings into a public PR
comment or issue.

## 2. CI gating contract

```bash
export OPENAI_API_KEY="$CODEX_SECURITY_KEY"

npx @openai/codex-security scan . \
  --diff "origin/${GITHUB_BASE_REF:-main}" \
  --output-dir "$RUNNER_TEMP/security-results" \
  --fail-on-severity high \
  --max-cost 5 \
  --json > "$RUNNER_TEMP/scan.json"
```

The three-state exit code is the whole contract, and collapsing it is the
classic mistake:

| Exit | Meaning | Correct CI behavior |
|---|---|---|
| 0 | Completed, under threshold | Pass |
| 1 | Completed, threshold breached | Fail the job |
| 2 | Incomplete coverage or runtime error | Fail the job — **not** a pass |

A job that only checks `if [ $? -eq 1 ]` turns every infrastructure hiccup into
a green build, which is worse than no scanner at all because it manufactures
confidence.

Notes for pipelines:

- Diff scans (`--diff`) keep per-PR cost proportional to the change. Reserve
  full-repository and `--mode deep` scans for a scheduled job.
- `--output-dir` must sit outside the checkout — `$RUNNER_TEMP` is the natural
  home on GitHub Actions.
- Set `CI` (most runners do) to suppress interactive update notices.
- Give the job only the credentials it needs: subprocesses inherit the
  environment, and a runner loaded with deploy secrets hands them to every
  scan subprocess.
- CI is noninteractive, so API-key precedence applies automatically; pass
  `--auth api-key` if a stray sign-in could be present.

## 3. Pre-commit hook

```bash
npx @openai/codex-security install-hook --fail-on-severity high
```

Scans staged and unstaged changes before each commit, respects
`core.hooksPath`, and will not replace an existing hook. Blocks on
high-severity findings and on failed scans.

This is a real latency and cost cost on every commit. It fits a
high-consequence repository (payments, auth, key handling); on a busy
application repo a per-PR CI diff scan is usually the better trade.

## 4. SARIF into GitHub code scanning

```bash
npx @openai/codex-security export "$RUNNER_TEMP/security-results" \
  --export-format sarif --output "$RUNNER_TEMP/results.sarif"
```

Then upload with `github/codeql-action/upload-sarif`. When SARIF is produced
during a scan it is also written to `<scan-dir>/exports/results.sarif`.

Uploading to code scanning makes findings visible to anyone with repository
read access — confirm that is intended before wiring it up on a private
codebase whose findings include reproduction steps.

## 5. Fleet sweeps with bulk-scan

For a portfolio sweep, pin revisions in CSV so the run is reproducible and
resumable:

```csv
id,repository,revision,scope,mode
api,https://github.com/acme/api.git,0123456789abcdef0123456789abcdef01234567,src,standard
wallet,https://github.com/acme/wallet.git,89abcdef0123456789abcdef0123456789abcdef,,deep
```

```bash
npx @openai/codex-security bulk-scan repositories.csv \
  --output-dir /path/outside/repos/security-scans \
  --workers 4 --max-attempts 2
```

`--workers` is repository concurrency and is independent of the per-scan Codex
thread limit; a scan already spends up to eight delegated workers of its own, so
raising both at once multiplies spend faster than expected. Rerunning the same
command resumes rather than restarting.

## 6. Regression tracking across scans

```bash
npx @openai/codex-security scans list .
npx @openai/codex-security scans compare "$BASELINE_ID" "$CURRENT_ID"
```

Findings are matched by root cause and classified as new, persisting, reopened,
resolved, or unknown. **Unknown means coverage was incomplete or the original
location was not reviewed** — it is a gap to close, not a fix to celebrate.
Report unknown counts alongside resolved counts or the trend line lies.

Record dismissals so they survive re-scans:

```bash
npx @openai/codex-security findings false-positive "$OCCURRENCE_ID" \
  --reason "Route is behind the admin middleware in src/middleware.ts:22"
```

## 7. Cost control patterns

Ordered by how much they save per unit of lost signal:

1. `--diff` or `--path` instead of a whole repository. Scope is the single
   biggest lever.
2. `--max-cost` on every invocation. Partial results are preserved, so a
   ceiling costs coverage, never the whole run.
3. `--effort high` (or lower) before dropping to a cheaper model — effort is the
   more granular dial, and `xhigh` is the default.
4. `--dry-run` to confirm effective model, effort, and destination for free
   before starting an expensive configuration.
5. Reserve `--mode deep` for scheduled sweeps of security-critical code, not
   per-PR checks. Deep repeats discovery until it stops finding new candidates,
   so its cost scales with how much there is to find.

Every scan records model, tokens, and estimated cost into its JSON result, the
scan history, and the bulk-scan receipt. Estimates use standard API token
prices including cached input and cache writes, and exclude fees and
surcharges — treat them as a floor when budgeting.
