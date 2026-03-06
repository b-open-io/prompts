#!/usr/bin/env bash
# Detect CI system, repo info, and current branch from project files and git state.
# Outputs JSON to stdout. All detection is file/git-based — no network calls.
set -euo pipefail

DIR="${1:-.}"
cd "$DIR"

ci="unknown"
config_file=""

# Detect CI system from config files (most specific first)
if [ -d ".github/workflows" ] && ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null | head -1 >/dev/null 2>&1; then
  ci="github-actions"
  config_file=$(ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null | head -1)
elif [ -f ".gitlab-ci.yml" ]; then
  ci="gitlab-ci"
  config_file=".gitlab-ci.yml"
elif [ -d ".circleci" ]; then
  ci="circleci"
  config_file=".circleci/config.yml"
elif [ -f "Jenkinsfile" ]; then
  ci="jenkins"
  config_file="Jenkinsfile"
elif [ -f "bitbucket-pipelines.yml" ]; then
  ci="bitbucket"
  config_file="bitbucket-pipelines.yml"
elif [ -f "azure-pipelines.yml" ]; then
  ci="azure"
  config_file="azure-pipelines.yml"
fi

# Detect deployment platform (can coexist with CI)
deploy=""
if [ -f "vercel.json" ] || [ -d ".vercel" ]; then
  deploy="vercel"
elif [ -f "netlify.toml" ]; then
  deploy="netlify"
elif [ -f "railway.json" ] || [ -f "railway.toml" ]; then
  deploy="railway"
fi

# Git info
branch=""
repo=""
sha=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  sha=$(git rev-parse --short HEAD 2>/dev/null || echo "")
  # Extract owner/repo from remote URL
  remote_url=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$remote_url" ]; then
    repo=$(echo "$remote_url" | sed -E 's#(https?://[^/]+/|git@[^:]+:)##; s/\.git$//')
  fi
fi

# Check for required CLI tools
has_gh=$(command -v gh >/dev/null 2>&1 && echo "true" || echo "false")
has_glab=$(command -v glab >/dev/null 2>&1 && echo "true" || echo "false")
has_vercel=$(command -v vercel >/dev/null 2>&1 && echo "true" || echo "false")

# Count workflow files for GitHub Actions
workflow_count=0
if [ "$ci" = "github-actions" ]; then
  workflow_count=$(ls .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null | wc -l | tr -d ' ')
fi

cat <<EOF
{
  "ci": "$ci",
  "deploy": "$deploy",
  "config_file": "$config_file",
  "workflow_count": $workflow_count,
  "repo": "$repo",
  "branch": "$branch",
  "sha": "$sha",
  "tools": {
    "gh": $has_gh,
    "glab": $has_glab,
    "vercel": $has_vercel
  }
}
EOF
