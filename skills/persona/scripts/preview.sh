#!/bin/bash
# Local post preview — generates a self-contained HTML file and opens it.
# Usage: preview.sh --post <json-path-or-stdin> [--image <path>] [--username <handle>]
set -e

PERSONA_DIR="${PERSONA_DIR:-.claude/persona}"
POST_PATH=""
IMAGE_PATH=""
USERNAME=""
PORT=4747

while [ $# -gt 0 ]; do
    case "$1" in
        --post) POST_PATH="$2"; shift 2 ;;
        --image) IMAGE_PATH="$2"; shift 2 ;;
        --username) USERNAME="${2#@}"; shift 2 ;;
        --port) PORT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Read post JSON
if [ -z "$POST_PATH" ]; then
    echo "Error: --post is required (path to JSON or - for stdin)"
    echo "Usage: preview.sh --post <json-or-stdin> [--image <path>] [--username <handle>]"
    echo ""
    echo "Post JSON format: {\"text\": \"...\", \"image_prompt\": \"...\"}"
    echo "Or thread format: {\"thread\": [{\"text\": \"...\"}]}"
    exit 1
fi

if [ "$POST_PATH" = "-" ]; then
    POST_JSON=$(cat)
else
    if [ ! -f "$POST_PATH" ]; then
        echo "Error: Post file not found: $POST_PATH" >&2
        exit 1
    fi
    POST_JSON=$(cat "$POST_PATH")
fi

# Resolve username from profile if not provided
if [ -z "$USERNAME" ]; then
    # Try to find most recent profile
    if [ -d "$PERSONA_DIR" ]; then
        PROFILE=$(find "$PERSONA_DIR" -name "*.json" -not -name "pool.json" -not -name "topics.json" -not -name "last-scan.json" -type f 2>/dev/null | head -1)
        if [ -n "$PROFILE" ]; then
            USERNAME=$(jq -r '.username // empty' "$PROFILE" 2>/dev/null)
        fi
    fi
    USERNAME="${USERNAME:-user}"
fi

# Build the HTML
PREVIEW_FILE="/tmp/persona-preview-${PORT}.html"

cat > "$PREVIEW_FILE" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Post Preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; color: #e7e9ea; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; padding: 40px 20px; min-height: 100vh; }
  .container { max-width: 600px; width: 100%; }
  h1 { font-size: 20px; margin-bottom: 8px; color: #71767b; font-weight: 400; }
  .meta { color: #71767b; font-size: 13px; margin-bottom: 24px; }
  .tweet { border: 1px solid #2f3336; border-radius: 16px; padding: 16px; margin-bottom: 12px; background: #16181c; }
  .tweet-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; background: #1d9bf0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; color: #fff; flex-shrink: 0; }
  .display-name { font-weight: 700; font-size: 15px; }
  .handle { color: #71767b; font-size: 14px; }
  .tweet-text { font-size: 15px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; margin-bottom: 12px; }
  .tweet-text .mention { color: #1d9bf0; }
  .tweet-text .hashtag { color: #1d9bf0; }
  .tweet-text .link { color: #1d9bf0; }
  .tweet-media { border-radius: 16px; overflow: hidden; margin-bottom: 12px; border: 1px solid #2f3336; }
  .tweet-media img { width: 100%; display: block; max-height: 400px; object-fit: cover; }
  .tweet-engagement { display: flex; gap: 48px; color: #71767b; padding-top: 8px; border-top: 1px solid #2f3336; }
  .tweet-engagement button { background: none; border: none; color: #71767b; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; padding: 4px; }
  .tweet-engagement button:hover { color: #1d9bf0; }
  .tweet-engagement svg { width: 18px; height: 18px; }
  .connector { width: 2px; height: 20px; background: #2f3336; margin: 0 auto; }
  .char-count { text-align: right; color: #71767b; font-size: 13px; margin-top: 4px; }
  .char-count.warn { color: #f7b731; }
  .char-count.over { color: #f4212e; }
  .image-prompt { margin-top: 12px; padding: 12px; background: #1e2732; border-radius: 8px; border: 1px solid #2f3336; }
  .image-prompt-label { color: #1d9bf0; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
  .image-prompt-text { color: #8b98a5; font-size: 13px; font-style: italic; }
  .actions { margin-top: 24px; display: flex; gap: 12px; justify-content: center; }
  .actions button { padding: 10px 24px; border-radius: 9999px; font-size: 15px; font-weight: 700; cursor: pointer; border: none; }
  .btn-copy { background: #1d9bf0; color: #fff; }
  .btn-copy:hover { background: #1a8cd8; }
  .btn-close { background: #2f3336; color: #e7e9ea; }
  .btn-close:hover { background: #3a3d41; }
  .copied { background: #00ba7c !important; }
</style>
</head>
<body>
<div class="container">
  <h1>Post Preview</h1>
  <div class="meta" id="meta"></div>
  <div id="tweets"></div>
  <div class="actions">
    <button class="btn-copy" id="copyBtn" onclick="copyText()">Copy Text</button>
  </div>
</div>
<script>
const POST_DATA = __POST_DATA__;
const IMAGE_DATA = __IMAGE_DATA__;
const USERNAME = __USERNAME__;

function escH(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function formatText(text) {
  return escH(text)
    .replace(/(https?:\/\/[^\s]+)/g, '<span class="link">$1</span>')
    .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
    .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>');
}

function renderTweet(text, imageData, imagePrompt, isLast) {
  const len = text.length;
  const charClass = len > 280 ? 'char-count over' : len > 260 ? 'char-count warn' : 'char-count';

  let html = '<div class="tweet">';
  html += '<div class="tweet-header">';
  html += '<div class="avatar">' + escH(USERNAME.charAt(0).toUpperCase()) + '</div>';
  html += '<div><div class="display-name">' + escH(USERNAME) + '</div>';
  html += '<div class="handle">@' + escH(USERNAME) + ' · now</div></div>';
  html += '</div>';
  html += '<div class="tweet-text">' + formatText(text) + '</div>';

  if (imageData) {
    html += '<div class="tweet-media"><img src="' + imageData + '" alt="Attached image"></div>';
  }

  if (imagePrompt && !imageData) {
    html += '<div class="image-prompt"><div class="image-prompt-label">Image Prompt</div>';
    html += '<div class="image-prompt-text">' + escH(imagePrompt) + '</div></div>';
  }

  html += '<div class="tweet-engagement">';
  html += '<button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.25-.893 4.306-2.376 5.806l-6.124 6.377a1 1 0 0 1-1.444-.003l-6.1-6.382C2.64 14.29 1.751 12.24 1.751 10z"/></svg></button>';
  html += '<button><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg></button>';
  html += '<button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z"/></svg></button>';
  html += '<button><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z"/></svg></button>';
  html += '</div>';
  html += '</div>';
  html += '<div class="' + charClass + '">' + len + '/280</div>';

  if (!isLast) html += '<div class="connector"></div>';
  return html;
}

// Parse post data
let parts = [];
if (POST_DATA.thread && Array.isArray(POST_DATA.thread)) {
  parts = POST_DATA.thread;
} else if (POST_DATA.text) {
  parts = [{ text: POST_DATA.text, image_prompt: POST_DATA.image_prompt }];
}

document.getElementById('meta').textContent = '@' + USERNAME + ' · ' + parts.length + (parts.length === 1 ? ' post' : '-part thread') + ' · ' + new Date().toLocaleString();

let tweetsHtml = '';
parts.forEach((p, i) => {
  const img = (i === 0 && IMAGE_DATA) ? IMAGE_DATA : null;
  tweetsHtml += renderTweet(p.text || '', img, p.image_prompt, i === parts.length - 1);
});
document.getElementById('tweets').innerHTML = tweetsHtml;

function copyText() {
  const text = parts.map(p => p.text).join('\n\n---\n\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy Text'; btn.classList.remove('copied'); }, 2000);
  });
}
</script>
</body>
</html>
HTMLEOF

# Write post JSON to temp file for python to read (avoids shell escaping issues)
POST_TMP="/tmp/persona-post-data-$$.json"
echo "$POST_JSON" > "$POST_TMP"

# Inject data into the HTML — all done in python to handle large base64 images
python3 << PYEOF
import json, base64, os

html = open("$PREVIEW_FILE").read()

# Post data
post = json.load(open("$POST_TMP"))
html = html.replace("__POST_DATA__", json.dumps(post))
os.unlink("$POST_TMP")

# Image
image_path = "$IMAGE_PATH"
if image_path and os.path.isfile(image_path):
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    import subprocess
    mime = subprocess.run(["file", "--mime-type", "-b", image_path], capture_output=True, text=True).stdout.strip() or "image/png"
    html = html.replace("__IMAGE_DATA__", json.dumps(f"data:{mime};base64,{b64}"))
else:
    html = html.replace("__IMAGE_DATA__", "null")

# Username
html = html.replace("__USERNAME__", json.dumps("$USERNAME"))

open("$PREVIEW_FILE", "w").write(html)
PYEOF

echo "Preview: file://$PREVIEW_FILE"
open "$PREVIEW_FILE" 2>/dev/null || xdg-open "$PREVIEW_FILE" 2>/dev/null || echo "Open $PREVIEW_FILE in your browser"
