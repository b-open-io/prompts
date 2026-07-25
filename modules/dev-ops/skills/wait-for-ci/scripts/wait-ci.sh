#!/usr/bin/env bash
# Wait for CI to complete on the current branch/commit.
# Outputs structured JSON when done. Designed to run as a background task.
#
# Usage: wait-ci.sh <ci-type> [--repo owner/repo] [--branch branch] [--sha sha] [--timeout 600]
#
# Supported CI types: github-actions, vercel
# Exit codes: 0 = all passed, 1 = failure/error, 2 = timeout
set -euo pipefail

CI_TYPE="${1:?Usage: wait-ci.sh <ci-type> [--repo repo] [--branch branch] [--sha sha] [--timeout 600]}"
shift

REPO=""
BRANCH=""
SHA=""
TIMEOUT=600
POLL_INTERVAL=15

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --sha) SHA="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --poll) POLL_INTERVAL="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Defaults from git if not provided
if [ -z "$BRANCH" ]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
fi
if [ -z "$SHA" ]; then
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "")
fi
if [ -z "$REPO" ]; then
  remote_url=$(git remote get-url origin 2>/dev/null || echo "")
  REPO=$(echo "$remote_url" | sed -E 's#(https?://[^/]+/|git@[^:]+:)##; s/\.git$//')
fi

elapsed=0

output_result() {
  local status="$1"
  local conclusion="$2"
  local details="$3"
  local url="$4"
  cat <<EOF
{
  "ci": "$CI_TYPE",
  "repo": "$REPO",
  "branch": "$BRANCH",
  "sha": "$SHA",
  "status": "$status",
  "conclusion": "$conclusion",
  "elapsed_seconds": $elapsed,
  "details": "$details",
  "url": "$url"
}
EOF
}

# ─── GitHub Actions ───────────────────────────────────────────────────────────

wait_github_actions() {
  if ! command -v gh >/dev/null 2>&1; then
    output_result "error" "missing_tool" "gh CLI not installed. Install: https://cli.github.com" ""
    exit 1
  fi

  # Find the most recent run for this branch/sha
  local run_id=""
  local run_url=""
  local attempts=0
  local max_find_attempts=10

  echo "Waiting for GitHub Actions run on $REPO@$BRANCH ($SHA)..." >&2

  # Wait for a run to appear (may not exist yet if just pushed)
  while [ -z "$run_id" ] && [ $attempts -lt $max_find_attempts ]; do
    run_info=$(gh run list --repo "$REPO" --branch "$BRANCH" --limit 1 --json databaseId,headSha,url,status 2>/dev/null || echo "[]")

    if [ "$run_info" != "[]" ] && echo "$run_info" | grep -q "databaseId"; then
      run_id=$(echo "$run_info" | grep -o '"databaseId":[0-9]*' | head -1 | cut -d: -f2)
      run_url=$(echo "$run_info" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi

    if [ -z "$run_id" ]; then
      attempts=$((attempts + 1))
      echo "  No run found yet (attempt $attempts/$max_find_attempts)..." >&2
      sleep "$POLL_INTERVAL"
      elapsed=$((elapsed + POLL_INTERVAL))
    fi
  done

  if [ -z "$run_id" ]; then
    output_result "error" "no_run_found" "No CI run found for $BRANCH after $max_find_attempts attempts" ""
    exit 1
  fi

  echo "  Found run $run_id — watching..." >&2

  # Use gh run watch for efficient blocking wait
  if gh run watch "$run_id" --repo "$REPO" --exit-status >/dev/null 2>&1; then
    # Success — get final details
    final_info=$(gh run view "$run_id" --repo "$REPO" --json conclusion,jobs 2>/dev/null || echo "{}")
    conclusion=$(echo "$final_info" | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4)

    # Get job summary
    job_summary=$(gh run view "$run_id" --repo "$REPO" --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"' 2>/dev/null | tr '\n' '; ' || echo "")

    output_result "completed" "${conclusion:-success}" "$job_summary" "$run_url"
    exit 0
  else
    # Failure — get details about what failed
    final_info=$(gh run view "$run_id" --repo "$REPO" --json conclusion,jobs 2>/dev/null || echo "{}")
    conclusion=$(echo "$final_info" | grep -o '"conclusion":"[^"]*"' | head -1 | cut -d'"' -f4)

    # Get failed job details
    failed_jobs=$(gh run view "$run_id" --repo "$REPO" --json jobs --jq '.jobs[] | select(.conclusion == "failure") | "\(.name): \(.conclusion)"' 2>/dev/null | tr '\n' '; ' || echo "unknown failure")

    # Get failed step logs (first failed job only, last 30 lines)
    failed_job_id=$(gh run view "$run_id" --repo "$REPO" --json jobs --jq '.jobs[] | select(.conclusion == "failure") | .databaseId' 2>/dev/null | head -1 || echo "")
    log_excerpt=""
    if [ -n "$failed_job_id" ]; then
      log_excerpt=$(gh run view "$run_id" --repo "$REPO" --log-failed 2>/dev/null | tail -30 | tr '"' "'" | tr '\n' '\\n' || echo "")
    fi

    details="Failed: $failed_jobs"
    if [ -n "$log_excerpt" ]; then
      details="$details | Logs: $log_excerpt"
    fi

    output_result "completed" "${conclusion:-failure}" "$details" "$run_url"
    exit 1
  fi
}

# ─── Vercel ───────────────────────────────────────────────────────────────────

wait_vercel() {
  if ! command -v vercel >/dev/null 2>&1; then
    output_result "error" "missing_tool" "vercel CLI not installed. Install: bun i -g vercel" ""
    exit 1
  fi

  echo "Waiting for Vercel deployment on $BRANCH..." >&2

  while [ $elapsed -lt $TIMEOUT ]; do
    # Get latest deployment for this branch
    deploy_info=$(vercel inspect --json 2>/dev/null || echo "")

    if [ -n "$deploy_info" ]; then
      state=$(echo "$deploy_info" | grep -o '"readyState":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
      url=$(echo "$deploy_info" | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

      case "$state" in
        READY)
          output_result "completed" "success" "Deployment ready" "https://$url"
          exit 0
          ;;
        ERROR|CANCELED)
          output_result "completed" "failure" "Deployment $state" "https://$url"
          exit 1
          ;;
        *)
          echo "  State: $state (${elapsed}s elapsed)..." >&2
          ;;
      esac
    fi

    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done

  output_result "timeout" "timeout" "Timed out after ${TIMEOUT}s" ""
  exit 2
}

# ─── GitLab CI ────────────────────────────────────────────────────────────────

wait_gitlab_ci() {
  if ! command -v glab >/dev/null 2>&1; then
    output_result "error" "missing_tool" "glab CLI not installed. Install: brew install glab" ""
    exit 1
  fi

  echo "Waiting for GitLab CI pipeline on $BRANCH..." >&2

  while [ $elapsed -lt $TIMEOUT ]; do
    pipeline_info=$(glab ci status --branch "$BRANCH" 2>/dev/null || echo "")

    if echo "$pipeline_info" | grep -qi "passed"; then
      output_result "completed" "success" "Pipeline passed" ""
      exit 0
    elif echo "$pipeline_info" | grep -qi "failed"; then
      output_result "completed" "failure" "$pipeline_info" ""
      exit 1
    elif echo "$pipeline_info" | grep -qi "canceled"; then
      output_result "completed" "cancelled" "Pipeline cancelled" ""
      exit 1
    fi

    echo "  Pipeline running (${elapsed}s elapsed)..." >&2
    sleep "$POLL_INTERVAL"
    elapsed=$((elapsed + POLL_INTERVAL))
  done

  output_result "timeout" "timeout" "Timed out after ${TIMEOUT}s" ""
  exit 2
}

# ─── Dispatch ─────────────────────────────────────────────────────────────────

case "$CI_TYPE" in
  github-actions) wait_github_actions ;;
  vercel) wait_vercel ;;
  gitlab-ci) wait_gitlab_ci ;;
  *)
    output_result "error" "unsupported" "CI type '$CI_TYPE' is not yet supported. Supported: github-actions, vercel, gitlab-ci" ""
    exit 1
    ;;
esac
