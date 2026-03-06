---
name: wait-for-ci
description: "Wait for CI/CD pipelines to complete after pushing code, then act on results. This skill should be used after git push, after creating a PR, when the user says 'wait for CI', 'check if the build passes', 'monitor the pipeline', 'wait for checks', 'is CI green?', or whenever the agent needs to verify that pushed code passes CI before proceeding. Also use when an agent workflow involves push-then-verify cycles, deployment monitoring, or needs to block on CI results before taking the next step. Supports GitHub Actions, GitLab CI, and Vercel deployments."
user-invocable: true
allowed-tools:
  - Bash
---

# Wait for CI

Wait for CI/CD pipelines to finish and get actionable results — without burning context on polling logic. Everything deterministic is handled by scripts. Your job is to spawn them and act on what comes back.

## Why Scripts Handle the Waiting

Polling a CI system is pure mechanics — no reasoning needed. The `wait-ci.sh` script handles all the waiting, retrying, and status parsing. Running it as a background task means you can do other work while CI runs, and you get notified with structured JSON when it finishes.

## Quick Start

Two steps: detect, then wait.

### Step 1: Detect CI System

```bash
bash <skill-path>/scripts/detect-ci.sh /path/to/project
```

Returns JSON like:
```json
{
  "ci": "github-actions",
  "deploy": "vercel",
  "config_file": ".github/workflows/ci.yml",
  "workflow_count": 3,
  "repo": "owner/repo",
  "branch": "feature-x",
  "sha": "abc1234",
  "tools": { "gh": true, "glab": false, "vercel": true }
}
```

If `ci` is `"unknown"`, tell the user no CI configuration was found and ask what they use.

If the required CLI tool is missing (`tools.gh`, `tools.glab`, or `tools.vercel` is false), tell the user to install it before proceeding.

### Step 2: Wait as a Background Task

Run the wait script with `run_in_background: true` so you stay unblocked:

```bash
bash <skill-path>/scripts/wait-ci.sh github-actions \
  --repo owner/repo \
  --branch feature-x \
  --sha abc1234 \
  --timeout 600
```

The script blocks until CI finishes (or times out), then outputs JSON:

```json
{
  "ci": "github-actions",
  "repo": "owner/repo",
  "branch": "feature-x",
  "sha": "abc1234",
  "status": "completed",
  "conclusion": "failure",
  "elapsed_seconds": 142,
  "details": "Failed: lint: failure; | Logs: error: unused variable...",
  "url": "https://github.com/owner/repo/actions/runs/12345"
}
```

### Step 3: Act on Results

When the background task completes, you get the JSON. Use it:

| `conclusion` | What to do |
|---|---|
| `success` | Report success. Proceed with next steps (merge, deploy, etc.) |
| `failure` | Read the `details` field for failed jobs and log excerpts. Fix the issue and push again. |
| `cancelled` | Tell the user CI was cancelled — they may need to re-trigger. |
| `timeout` | CI took too long. Link the user to the run URL so they can check manually. |
| `missing_tool` | Tell the user which CLI tool to install. |
| `no_run_found` | Push may not have triggered CI. Check if workflows exist for this branch. |

When CI fails, the `details` field contains the failed job names and a log excerpt (last 30 lines of the failed step). This is usually enough to identify the issue without manually opening the CI dashboard.

## Monitoring Both CI and Deployment

Some projects have both CI (GitHub Actions) and deployment (Vercel). You can run both in parallel as separate background tasks:

```bash
# Background task 1: CI
bash <skill-path>/scripts/wait-ci.sh github-actions --repo owner/repo --branch main

# Background task 2: Deployment
bash <skill-path>/scripts/wait-ci.sh vercel --branch main
```

Each will notify you independently when done.

## Typical Agent Workflows

### Push-and-Verify

After pushing a fix or feature:
1. Run `detect-ci.sh` to get the CI config
2. Spawn `wait-ci.sh` as a background task
3. Continue working on other tasks (or tell the user you're waiting)
4. When notified, report the result or fix failures

### Iterative Fix Loop

When CI fails:
1. Read the failure details from the JSON output
2. Fix the issue in code
3. Commit and push
4. Spawn a new `wait-ci.sh` background task for the new commit
5. Repeat until green

### Pre-Merge Gate

Before merging a PR:
1. Spawn `wait-ci.sh` for the PR branch
2. Only proceed with merge when `conclusion` is `success`
3. If it fails, fix and re-push instead of merging broken code

## Supported CI Systems

| System | CLI Required | Detection | Wait Method |
|---|---|---|---|
| GitHub Actions | `gh` | `.github/workflows/*.yml` | `gh run watch` (blocking, efficient) |
| GitLab CI | `glab` | `.gitlab-ci.yml` | `glab ci status` (polling) |
| Vercel | `vercel` | `vercel.json` or `.vercel/` | `vercel inspect` (polling) |

GitHub Actions uses `gh run watch` which is a native blocking wait — no polling overhead. GitLab and Vercel use periodic polling at 15-second intervals.

## Options

| Flag | Default | Description |
|---|---|---|
| `--repo` | From git remote | Repository in `owner/repo` format |
| `--branch` | Current branch | Branch to monitor |
| `--sha` | Current HEAD | Commit SHA to match |
| `--timeout` | 600 (10 min) | Max seconds to wait before timing out |
| `--poll` | 15 | Seconds between status checks (GitLab/Vercel only) |
