#!/usr/bin/env bash
# npm-publish: Create a granular access token via agent-browser.
#
# Flow:
#   1. Open npmjs.com/settings → detect username from redirect
#   2. Navigate to token creation page
#   3. Fill form (cli-publish, 7-day, read+write, all packages)
#   4. User reviews and clicks "Generate token" (one interaction)
#   5. Capture token via clipboard (never in terminal/logs)
#   6. Write to ~/.npmrc
#   7. Revoke any old "cli-publish" tokens
#
# Prerequisites: agent-browser installed, Chrome open, logged into npmjs.com
# Usage: setup-token.sh
set -euo pipefail

NPMRC="$HOME/.npmrc"

# Check agent-browser is available and up to date (>= 0.20.0 for Chrome integration)
MIN_VERSION="0.20.0"
if ! command -v agent-browser >/dev/null 2>&1; then
  echo "agent-browser not installed. Installing..."
  bun install -g agent-browser@latest
elif [ "$(agent-browser --version 2>/dev/null | head -1 | sed 's/agent-browser //')" \< "$MIN_VERSION" ]; then
  echo "agent-browser outdated (need >= $MIN_VERSION for Chrome integration). Upgrading..."
  bun install -g agent-browser@latest
fi

# --- Step 1: Detect npm username from browser session ---
echo "Detecting npm username from browser session..."
agent-browser --auto-connect open "https://www.npmjs.com/settings" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1

CURRENT_URL=$(agent-browser get url 2>/dev/null)

# Check if redirected to login (not authenticated in browser)
if echo "$CURRENT_URL" | grep -q "/login"; then
  echo "ERROR: Not logged into npmjs.com in Chrome." >&2
  echo "Open https://www.npmjs.com/login in Chrome, sign in, then retry." >&2
  exit 1
fi

# Extract username from URL: /settings/{username}
NPM_USER=$(echo "$CURRENT_URL" | sed -n 's|.*/settings/\([^/]*\).*|\1|p')
if [ -z "$NPM_USER" ]; then
  echo "ERROR: Could not extract npm username from URL: $CURRENT_URL" >&2
  exit 1
fi
echo "npm user: $NPM_USER"

# --- Step 2: Navigate to token creation page ---
echo "Opening token creation page..."
agent-browser open "https://www.npmjs.com/settings/$NPM_USER/tokens/granular-access-tokens/new" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1

# --- Step 3: Fill the form ---
echo "Filling token form..."

# Take snapshot to get element refs
SNAPSHOT=$(agent-browser snapshot -i 2>/dev/null)

# Find refs from snapshot
TOKEN_NAME_REF=$(echo "$SNAPSHOT" | grep -i 'textbox "Token name"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//')
BYPASS_2FA_REF=$(echo "$SNAPSHOT" | grep -i 'checkbox.*Bypass' | grep -o 'ref=e[0-9]*' | sed 's/ref=//')
ALL_PACKAGES_REF=$(echo "$SNAPSHOT" | grep -i 'radio "All packages"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//')
GENERATE_REF=$(echo "$SNAPSHOT" | grep -i 'button "Generate token"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//')

if [ -z "$TOKEN_NAME_REF" ] || [ -z "$GENERATE_REF" ]; then
  echo "ERROR: Could not find form elements. Page may have changed." >&2
  echo "Snapshot:" >&2
  echo "$SNAPSHOT" >&2
  exit 1
fi

# Fill token name with timestamp for uniqueness
TOKEN_LABEL="cli-publish"
agent-browser fill "@$TOKEN_NAME_REF" "$TOKEN_LABEL" >/dev/null 2>&1

# Ensure bypass 2FA is UNCHECKED (keep security)
if echo "$SNAPSHOT" | grep -i 'checkbox.*Bypass' | grep -q 'checked=true'; then
  agent-browser click "@$BYPASS_2FA_REF" >/dev/null 2>&1
fi

# Select "All packages" radio
if [ -n "$ALL_PACKAGES_REF" ]; then
  agent-browser click "@$ALL_PACKAGES_REF" >/dev/null 2>&1
fi

# Set permissions to "Read and write" for packages
# These are button-based dropdowns, not selects. Find and click.
agent-browser eval --stdin >/dev/null 2>&1 <<'EVALEOF'
(function() {
  var buttons = document.querySelectorAll('button');
  var rwClicked = 0;
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].textContent.trim() === 'Read and write' && rwClicked < 2) {
      buttons[i].click();
      rwClicked++;
    }
  }
  // Set expiration to 7 days
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].textContent.trim() === '7 days') {
      buttons[i].click();
      break;
    }
  }
  return 'configured';
})()
EVALEOF

echo ""
echo "============================================================"
echo "  Form filled: $TOKEN_LABEL / 7-day / read+write / all pkgs"
echo "  Review the form in Chrome, then click 'Generate token'."
echo "============================================================"
echo ""

# --- Step 4: Wait for user to click Generate token ---
# Poll the page until the token value appears.
# After clicking Generate, npm shows the token string on a new page.
echo "Waiting for token generation..."
TOKEN_FOUND=false
for i in $(seq 1 60); do
  sleep 2

  # Check if the page now shows a token (npm displays it after generation)
  PAGE_URL=$(agent-browser get url 2>/dev/null || true)

  # After generation, npm redirects to the tokens list or shows token inline
  # The token page has a "Copy" button and displays the token
  PAGE_SNAP=$(agent-browser snapshot -i 2>/dev/null || true)

  # Look for the copy button that appears with the generated token
  if echo "$PAGE_SNAP" | grep -qi "copy.*token\|token.*copy\|npm_"; then
    TOKEN_FOUND=true
    break
  fi

  # Also check if URL changed to tokens list (token was created)
  if echo "$PAGE_URL" | grep -q "/tokens$" && [ "$i" -gt 2 ]; then
    TOKEN_FOUND=true
    break
  fi
done

if [ "$TOKEN_FOUND" = false ]; then
  echo "Timed out waiting for token generation." >&2
  echo "If you generated the token, copy it manually and run:" >&2
  echo "  echo '//registry.npmjs.org/:_authToken=YOUR_TOKEN' > ~/.npmrc" >&2
  exit 1
fi

# --- Step 5: Capture token via clipboard ---
echo "Capturing token via clipboard..."

# Find and click the Copy button
COPY_SNAP=$(agent-browser snapshot -i 2>/dev/null)
COPY_REF=$(echo "$COPY_SNAP" | grep -i 'button.*copy' | head -1 | grep -o 'ref=e[0-9]*' | sed 's/ref=//')

if [ -n "$COPY_REF" ]; then
  agent-browser click "@$COPY_REF" >/dev/null 2>&1
  sleep 1

  # Read token from clipboard, write to .npmrc, clear clipboard
  TOKEN=$(pbpaste 2>/dev/null)

  if [ -n "$TOKEN" ] && echo "$TOKEN" | grep -q "^npm_"; then
    echo "//registry.npmjs.org/:_authToken=$TOKEN" > "$NPMRC"
    # Clear clipboard immediately — token should not linger
    echo -n "" | pbcopy
    echo "Token written to ~/.npmrc"
  else
    echo "ERROR: Clipboard does not contain a valid npm token (expected npm_...)." >&2
    echo "Copy the token manually and run:" >&2
    echo "  echo '//registry.npmjs.org/:_authToken=YOUR_TOKEN' > ~/.npmrc" >&2
    exit 1
  fi
else
  # Fallback: try to extract token from page text
  echo "Could not find Copy button. Trying to extract from page..." >&2
  TOKEN=$(echo "$COPY_SNAP" | grep -o 'npm_[A-Za-z0-9]*' | head -1)
  if [ -n "$TOKEN" ]; then
    echo "//registry.npmjs.org/:_authToken=$TOKEN" > "$NPMRC"
    echo "Token written to ~/.npmrc"
  else
    echo "ERROR: Could not capture token." >&2
    echo "Copy the token from the browser and run:" >&2
    echo "  echo '//registry.npmjs.org/:_authToken=YOUR_TOKEN' > ~/.npmrc" >&2
    exit 1
  fi
fi

# --- Step 6: Revoke old cli-publish tokens ---
echo "Checking for old cli-publish tokens to revoke..."

agent-browser open "https://www.npmjs.com/settings/$NPM_USER/tokens" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 1

# Snapshot the tokens page to find old cli-publish tokens
TOKENS_SNAP=$(agent-browser snapshot -i 2>/dev/null)

# Count cli-publish tokens — if more than 1, the older ones need revoking.
# npm shows tokens in a list with delete buttons.
# We look for delete buttons associated with "cli-publish" entries.
CLI_PUBLISH_COUNT=$(echo "$TOKENS_SNAP" | grep -c "cli-publish" || true)

if [ "$CLI_PUBLISH_COUNT" -gt 1 ]; then
  echo "Found $CLI_PUBLISH_COUNT cli-publish tokens. Old ones should be revoked."
  echo "Visit https://www.npmjs.com/settings/$NPM_USER/tokens to clean up."
  # Note: Automated deletion is risky — we'd need to identify which token
  # is the NEW one vs old ones. For safety, we flag it and let the user decide.
  # Future improvement: parse token creation dates from the page.
else
  echo "No old tokens to clean up."
fi

echo ""
echo "Token setup complete."
