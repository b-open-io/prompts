#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

REMOTE="$TMP_DIR/remote.git"
REPO="$TMP_DIR/repo"
git init --bare -q "$REMOTE"
git init -q "$REPO"
git -C "$REPO" config user.email test@example.invalid
git -C "$REPO" config user.name "npm-publish test"
printf '{"name":"release-test","version":"1.0.0"}\n' > "$REPO/package.json"
git -C "$REPO" add package.json
git -C "$REPO" commit -q -m initial
git -C "$REPO" branch -M master
git -C "$REPO" remote add origin "$REMOTE"
git -C "$REPO" push -q -u origin master
git -C "$REPO" remote set-head origin -a >/dev/null
git -C "$REPO" switch -q -c feature/test-release
printf 'unreleased change\n' > "$REPO/CHANGELOG.md"

OUTPUT=$(cd "$REPO" && bash "$SCRIPT_DIR/release.sh" --access public 2>&1 || true)

if ! printf '%s\n' "$OUTPUT" | grep -q 'WRONG_BRANCH'; then
  echo "FAIL: release.sh did not reject a non-default branch" >&2
  printf '%s\n' "$OUTPUT" >&2
  exit 1
fi

if git -C "$REPO" status --porcelain --untracked-files=all | grep -q '^?? CHANGELOG.md$'; then
  echo "PASS: release.sh preserves the non-default branch working tree"
else
  echo "FAIL: release.sh unexpectedly changed the working tree" >&2
  exit 1
fi

echo "PASS: release.sh rejects non-default branches before staging or pushing"
