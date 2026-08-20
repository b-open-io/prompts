#!/usr/bin/env bash
# List visual-proposal HTML files as JSON for window.VP_ARCHIVE.
# Default root: $PWD/docs/proposals
# Extra project roots: remaining args, or BOPEN_PROPOSAL_ROOTS (colon-separated).
# Pass every workspace root this session can see (Claude --add-dir, extra
# Codex/Grok folders). The browser cannot scan the disk.

set -euo pipefail

CURRENT=""
ROOTS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --current)
      CURRENT="${2:-}"
      shift 2
      ;;
    --current=*)
      CURRENT="${1#--current=}"
      shift
      ;;
    --)
      shift
      ROOTS+=("$@")
      break
      ;;
    -*)
      echo "unknown flag: $1" >&2
      exit 2
      ;;
    *)
      ROOTS+=("$1")
      shift
      ;;
  esac
done

if [[ -n "${BOPEN_PROPOSAL_ROOTS:-}" ]]; then
  IFS=':' read -r -a extra <<< "$BOPEN_PROPOSAL_ROOTS"
  ROOTS+=("${extra[@]}")
fi

python3 - "$CURRENT" "${ROOTS[@]+"${ROOTS[@]}"}" <<'PY'
import json, os, re, sys
from datetime import datetime, timezone

current = sys.argv[1] if len(sys.argv) > 1 else ""
extra_roots = [r for r in sys.argv[2:] if r]

def git_root(start: str) -> str:
    d = os.path.abspath(start)
    while True:
        if os.path.isdir(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return os.path.abspath(start)
        d = parent

def meta_of(path: str, slug: str):
    """Return (title, https_url_or_None) from the file head."""
    try:
        text = open(path, encoding="utf-8", errors="replace").read(8000)
    except OSError:
        return slug, None
    title = slug
    m = re.search(r'data-vp-title=["\']([^"\']+)["\']', text)
    if m:
        title = m.group(1).strip()
    else:
        m = re.search(r"<title>([^<]+)</title>", text, re.I)
        if m:
            title = re.sub(r"\s+", " ", m.group(1)).strip()
    url = None
    m = re.search(r'data-vp-url=["\']([^"\']+)["\']', text)
    if m:
        candidate = m.group(1).strip()
        if candidate.startswith("https://"):
            url = candidate
    return title, url

seen = set()
items = []
cwd = os.getcwd()
scan_roots = [cwd] + extra_roots

for raw in scan_roots:
    project = git_root(raw)
    folder = os.path.join(project, "docs", "proposals")
    if not os.path.isdir(folder):
        continue
    key = os.path.realpath(folder)
    if key in seen:
        continue
    seen.add(key)
    same_dir = os.path.realpath(folder) == os.path.realpath(
        os.path.join(cwd, "docs", "proposals")
    )
    project_name = os.path.basename(project)
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".html"):
            continue
        if name.startswith("."):
            continue
        path = os.path.join(folder, name)
        if not os.path.isfile(path):
            continue
        slug = name[:-5]
        st = os.stat(path)
        mtime = datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).strftime(
            "%Y-%m-%d"
        )
        title, url = meta_of(path, slug)
        item = {
            "slug": slug,
            "title": title,
            "project": project_name,
            "mtime": mtime,
            "path": os.path.abspath(path),
            "current": slug == current and same_dir,
        }
        if url:
            item["url"] = url
        items.append(item)

print(json.dumps(items, indent=2, ensure_ascii=False))
PY
