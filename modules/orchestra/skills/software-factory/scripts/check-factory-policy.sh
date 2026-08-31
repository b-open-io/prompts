#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: check-factory-policy.sh [--repo OWNER/REPO] [--branch NAME] [--require-non-admin]
       check-factory-policy.sh --self-test

Verifies the live GitHub default branch is protected. With
--require-non-admin, also rejects ADMIN/MAINTAIN worker credentials.
EOF
}

privileged_permission() {
  case "$1" in
    ADMIN|MAINTAIN) return 0 ;;
    *) return 1 ;;
  esac
}

self_test() {
  privileged_permission ADMIN
  privileged_permission MAINTAIN
  ! privileged_permission WRITE
  ! privileged_permission READ
  echo "check-factory-policy: self-test passed"
}

repo=""
branch=""
require_non_admin=0

while (($#)); do
  case "$1" in
    --repo) repo="${2:?--repo requires OWNER/REPO}"; shift 2 ;;
    --branch) branch="${2:?--branch requires NAME}"; shift 2 ;;
    --require-non-admin) require_non_admin=1; shift ;;
    --self-test) self_test; exit 0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

command -v gh >/dev/null 2>&1 || { echo "check-factory-policy: gh is required" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "check-factory-policy: gh is not authenticated" >&2; exit 1; }

view="$(gh repo view ${repo:+"$repo"} --json nameWithOwner,defaultBranchRef,viewerPermission)"
repo="${repo:-$(python3 -c 'import json,sys; print(json.load(sys.stdin)["nameWithOwner"])' <<<"$view")}"
branch="${branch:-$(python3 -c 'import json,sys; print(json.load(sys.stdin)["defaultBranchRef"]["name"])' <<<"$view")}"
permission="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["viewerPermission"])' <<<"$view")"
protected="$(gh api "repos/$repo/branches/$branch" --jq '.protected')"

if [[ "$protected" != "true" ]]; then
  echo "check-factory-policy: FAIL $repo/$branch is not protected" >&2
  exit 1
fi
if ((require_non_admin)) && privileged_permission "$permission"; then
  echo "check-factory-policy: FAIL worker identity has bypass-capable permission $permission" >&2
  exit 1
fi

printf 'check-factory-policy: PASS repo=%s branch=%s protected=true permission=%s\n' "$repo" "$branch" "$permission"
