#!/usr/bin/env bash
# embed-avatars.sh — produce an inline avatar map for a visual-proposal Artifact.
#
# The Artifact CSP blocks external <img src>, so roster advocate/judge avatars
# must be embedded as data URIs. This fetches each agent's published avatar,
# downscales it to a small JPEG, and prints a ready-to-paste <script> block:
#
#   <script>window.AV={"uno-satoj":"data:image/jpeg;base64,…", …};
#   document.querySelectorAll('img[data-a]').forEach(…set src…)</script>
#
# In the page, give each panelist <img data-a="uno-satoj"> and paste the block;
# the loader wires every src on load.
#
# Usage:  embed-avatars.sh <slug> [<slug> ...]
#   slug = display_name.toLowerCase().replace(/[^a-z0-9]+/g,'-')   ("Uno Satoj" → uno-satoj)
# Source order per slug: local $BOPEN_AGENTS_DIR, then https://bopen.ai/images/agents/<slug>.png
set -euo pipefail

[ $# -ge 1 ] || { echo "usage: $0 <slug> [<slug>...]" >&2; exit 1; }

LOCAL_DIR="${BOPEN_AGENTS_DIR:-$HOME/code/bopen-ai/public/images/agents}"
SIZE="${AVATAR_SIZE:-128}"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
entries=(); missing=()

for slug in "$@"; do
  png="$tmp/$slug.png"
  if [ -f "$LOCAL_DIR/$slug.png" ]; then
    cp "$LOCAL_DIR/$slug.png" "$png"
  elif ! curl -fsSL "https://bopen.ai/images/agents/$slug.png" -o "$png" 2>/dev/null; then
    missing+=("$slug"); continue
  fi
  jpg="$tmp/$slug.jpg"
  if command -v sips >/dev/null 2>&1; then
    sips -Z "$SIZE" -s format jpeg -s formatOptions 72 "$png" --out "$jpg" >/dev/null 2>&1
  elif command -v magick >/dev/null 2>&1; then
    magick "$png" -resize "${SIZE}x${SIZE}" -quality 72 "$jpg"
  elif command -v convert >/dev/null 2>&1; then
    convert "$png" -resize "${SIZE}x${SIZE}" -quality 72 "$jpg"
  else
    echo "error: need 'sips' (macOS) or ImageMagick to downscale" >&2; exit 1
  fi
  b64="$(base64 < "$jpg" | tr -d '\n')"
  entries+=("\"$slug\":\"data:image/jpeg;base64,$b64\"")
done

[ ${#entries[@]} -gt 0 ] || { echo "error: no avatars resolved for: $*" >&2; exit 1; }

{
  printf '<script>window.AV={'
  IFS=,; printf '%s' "${entries[*]}"; unset IFS
  printf '};document.querySelectorAll("img[data-a]").forEach(function(i){var s=window.AV[i.getAttribute("data-a")];if(s)i.src=s;});</script>\n'
}

[ ${#missing[@]} -eq 0 ] || echo "warn: no avatar for: ${missing[*]} — use initials-in-a-circle fallback for these" >&2
