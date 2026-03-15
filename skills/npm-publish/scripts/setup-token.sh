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

# All agent-browser commands use --auto-connect to attach to the user's
# live Chrome session. The AB alias keeps commands readable.
AB="agent-browser --auto-connect"

# npm is slow — open commands may time out on load events even though
# navigation succeeds. This helper navigates and verifies by URL.
ab_nav() {
  local URL="$1"
  # Try open, ignore timeout errors (navigation still happens)
  $AB open "$URL" 2>/dev/null || true
  sleep 2
  # Verify we actually navigated
  local CURRENT
  CURRENT=$($AB get url 2>/dev/null || true)
  if [ -z "$CURRENT" ]; then
    echo "ERROR: Could not connect to Chrome. Is remote debugging enabled?" >&2
    return 1
  fi
}

# Check agent-browser is available
if ! command -v agent-browser >/dev/null 2>&1; then
  echo "agent-browser not installed. Installing..."
  bun install -g agent-browser@latest
fi

# --- Step 1: Detect npm username from browser session ---
# npm doesn't redirect /settings to /settings/{username}, so we extract
# the username from a settings link in the page DOM instead.
echo "Detecting npm username from browser session..."
ab_nav "https://www.npmjs.com"

# eval returns JSON-quoted strings — strip quotes with tr
NPM_USER=$($AB eval 'var a = document.querySelector("a[href*=settings]"); a ? a.href.match(/settings\/([^/]+)/)?.[1] || "" : ""' 2>/dev/null | tr -d '"' || true)

if [ -z "$NPM_USER" ]; then
  echo "Not logged into npmjs.com. Opening login page..."
  ab_nav "https://www.npmjs.com/login"
  echo "============================================================"
  echo "  Sign in to npmjs.com in Chrome to continue."
  echo "============================================================"

  # Poll until user completes login (settings link appears in DOM)
  for _ in $(seq 1 90); do
    sleep 2
    NPM_USER=$($AB eval 'var a = document.querySelector("a[href*=settings]"); a ? a.href.match(/settings\/([^/]+)/)?.[1] || "" : ""' 2>/dev/null | tr -d '"' || true)
    if [ -n "$NPM_USER" ]; then
      break
    fi
  done

  if [ -z "$NPM_USER" ]; then
    echo "ERROR: Timed out waiting for npm login." >&2
    exit 1
  fi
fi
echo "npm user: $NPM_USER"

# --- Step 2: Navigate to token creation page ---
echo "Opening token creation page..."
ab_nav "https://www.npmjs.com/settings/$NPM_USER/tokens/granular-access-tokens/new"

# --- Step 3: Fill the form ---
echo "Filling token form..."

# Take snapshot to get element refs
SNAPSHOT=$($AB snapshot -i 2>/dev/null)

# Find refs from snapshot
TOKEN_NAME_REF=$(echo "$SNAPSHOT" | grep -i 'textbox "Token name"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)
BYPASS_2FA_REF=$(echo "$SNAPSHOT" | grep -i 'checkbox.*Bypass' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)
ALL_PACKAGES_REF=$(echo "$SNAPSHOT" | grep -i 'radio "All packages"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)
GENERATE_REF=$(echo "$SNAPSHOT" | grep -i 'button "Generate token"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)

if [ -z "$TOKEN_NAME_REF" ] || [ -z "$GENERATE_REF" ]; then
  echo "ERROR: Could not find form elements. Page may have changed." >&2
  echo "Snapshot:" >&2
  echo "$SNAPSHOT" >&2
  exit 1
fi

# Fill token name
TOKEN_LABEL="cli-publish"
$AB fill "@$TOKEN_NAME_REF" "$TOKEN_LABEL" >/dev/null 2>&1 || true

# Ensure bypass 2FA is UNCHECKED (keep security)
if echo "$SNAPSHOT" | grep -i 'checkbox.*Bypass' | grep -q 'checked=true'; then
  $AB click "@$BYPASS_2FA_REF" >/dev/null 2>&1 || true
fi

# Select "All packages" radio
if [ -n "$ALL_PACKAGES_REF" ]; then
  $AB click "@$ALL_PACKAGES_REF" >/dev/null 2>&1 || true
fi

# Set permissions to "Read and write" for packages and expiration to 7 days
# These are button-based dropdowns, not selects.
$AB eval --stdin >/dev/null 2>&1 <<'EVALEOF' || true
(function() {
  var buttons = document.querySelectorAll('button');
  var rwClicked = 0;
  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i].textContent.trim() === 'Read and write' && rwClicked < 2) {
      buttons[i].click();
      rwClicked++;
    }
  }
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
echo "Waiting for token generation..."
TOKEN_FOUND=false
for i in $(seq 1 60); do
  sleep 2

  PAGE_URL=$($AB get url 2>/dev/null || true)
  PAGE_SNAP=$($AB snapshot -i 2>/dev/null || true)

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

COPY_SNAP=$($AB snapshot -i 2>/dev/null || true)
COPY_REF=$(echo "$COPY_SNAP" | grep -i 'button.*copy' | head -1 | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)

if [ -n "$COPY_REF" ]; then
  $AB click "@$COPY_REF" >/dev/null 2>&1 || true
  sleep 1

  TOKEN=$(pbpaste 2>/dev/null || true)

  if [ -n "$TOKEN" ] && echo "$TOKEN" | grep -q "^npm_"; then
    echo "//registry.npmjs.org/:_authToken=$TOKEN" > "$NPMRC"
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
  TOKEN=$(echo "$COPY_SNAP" | grep -o 'npm_[A-Za-z0-9]*' | head -1 || true)
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

ab_nav "https://www.npmjs.com/settings/$NPM_USER/tokens"

TOKENS_SNAP=$($AB snapshot -i 2>/dev/null || true)
CLI_PUBLISH_COUNT=$(echo "$TOKENS_SNAP" | grep -c "cli-publish" || true)

if [ "$CLI_PUBLISH_COUNT" -gt 1 ]; then
  echo "Found $CLI_PUBLISH_COUNT cli-publish tokens. Old ones should be revoked."
  echo "Visit https://www.npmjs.com/settings/$NPM_USER/tokens to clean up."
else
  echo "No old tokens to clean up."
fi

echo ""
echo "Token setup complete."
