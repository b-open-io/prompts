#!/usr/bin/env bash
# npm-publish: Create a granular access token via agent-browser.
#
# Two modes:
#   setup-token.sh fill    — detect user, navigate, fill form, exit
#   setup-token.sh capture — poll for generated token, write to ~/.npmrc
#
# Prerequisites: agent-browser installed, Chrome open, logged into npmjs.com
# Usage: setup-token.sh <fill|capture>
set -euo pipefail

NPMRC="$HOME/.npmrc"
AB="agent-browser --auto-connect"

ab_nav() {
  $AB open "$1" 2>/dev/null || true
  sleep 3
}

# Helper: click a cursor-interactive dropdown, wait for menu, click option
# Usage: ab_dropdown "No access" "Read and write"
ab_dropdown() {
  local TRIGGER_TEXT="$1"
  local OPTION_TEXT="$2"

  # Snapshot with -C to see cursor-interactive elements (custom dropdowns)
  local SNAP
  SNAP=$($AB snapshot -i -C 2>/dev/null || true)

  # Find the first matching clickable element with the trigger text
  local TRIGGER_REF
  TRIGGER_REF=$(echo "$SNAP" | grep -F "(clickable) \"$TRIGGER_TEXT\"" | head -1 | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)

  if [ -z "$TRIGGER_REF" ]; then
    return 1
  fi

  # Click to open dropdown
  $AB click "@$TRIGGER_REF" >/dev/null 2>&1 || true
  sleep 1

  # Re-snapshot to see dropdown options
  local SNAP2
  SNAP2=$($AB snapshot -i -C 2>/dev/null || true)

  # Find and click the option
  local OPTION_REF
  OPTION_REF=$(echo "$SNAP2" | grep -F "\"$OPTION_TEXT\"" | head -1 | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)

  if [ -z "$OPTION_REF" ]; then
    return 1
  fi

  $AB click "@$OPTION_REF" >/dev/null 2>&1 || true
  sleep 0.5
}

# Check agent-browser
if ! command -v agent-browser >/dev/null 2>&1; then
  echo "INSTALLING_AGENT_BROWSER"
  bun install -g agent-browser@latest >/dev/null 2>&1
fi

MODE="${1:-fill}"

if [ "$MODE" = "fill" ]; then
  # --- PHASE 1: Detect user, navigate, fill form ---

  # Detect npm username from DOM
  ab_nav "https://www.npmjs.com"
  NPM_USER=$($AB eval 'var a = document.querySelector("a[href*=settings]"); a ? a.href.match(/settings\/([^/]+)/)?.[1] || "" : ""' 2>/dev/null | tr -d '"' || true)

  if [ -z "$NPM_USER" ]; then
    echo "NOT_LOGGED_IN"
    ab_nav "https://www.npmjs.com/login"
    exit 1
  fi

  # Navigate to token creation page
  ab_nav "https://www.npmjs.com/settings/$NPM_USER/tokens/granular-access-tokens/new"

  # Snapshot to find form elements
  SNAPSHOT=$($AB snapshot -i 2>/dev/null || true)
  TOKEN_NAME_REF=$(echo "$SNAPSHOT" | grep -i 'textbox "Token name"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)

  if [ -z "$TOKEN_NAME_REF" ]; then
    echo "FORM_NOT_FOUND"
    exit 1
  fi

  # Fill token name
  $AB fill "@$TOKEN_NAME_REF" "cli-publish" >/dev/null 2>&1 || true

  # Ensure bypass 2FA is unchecked
  BYPASS_REF=$(echo "$SNAPSHOT" | grep -i 'checkbox.*Bypass' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)
  if [ -n "$BYPASS_REF" ] && echo "$SNAPSHOT" | grep -i 'checkbox.*Bypass' | grep -q 'checked=true'; then
    $AB click "@$BYPASS_REF" >/dev/null 2>&1 || true
  fi

  # Select All packages radio (if not already selected)
  ALL_PKG_REF=$(echo "$SNAPSHOT" | grep -i 'radio "All packages"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)
  if [ -n "$ALL_PKG_REF" ]; then
    $AB click "@$ALL_PKG_REF" >/dev/null 2>&1 || true
  fi

  # Set Packages permissions: click "No access" dropdown → select "Read and write"
  ab_dropdown "No access" "Read and write" || true

  # Set Organizations permissions: click remaining "No access" dropdown → select "Read and write"
  ab_dropdown "No access" "Read and write" || true

  # Set Expiration: click "30 days" dropdown → select "7 days"
  ab_dropdown "30 days" "7 days" || true

  # Scroll to bottom so Generate token button is visible
  $AB scroll down 9999 >/dev/null 2>&1 || true

  echo "FORM_READY:$NPM_USER"

elif [ "$MODE" = "capture" ]; then
  # --- PHASE 2: Wait for token, capture via clipboard, write .npmrc ---

  TOKEN_FOUND=false
  for i in $(seq 1 90); do
    sleep 2

    # Snapshot with -C to catch any Copy button variant
    SNAP=$($AB snapshot -i -C 2>/dev/null || true)

    # Look for Copy button (standard button or clickable element)
    COPY_REF=$(echo "$SNAP" | grep -i 'copy' | grep -o 'ref=e[0-9]*' | head -1 | sed 's/ref=//' || true)

    if [ -n "$COPY_REF" ]; then
      $AB click "@$COPY_REF" >/dev/null 2>&1 || true
      sleep 1

      TOKEN=$(pbpaste 2>/dev/null || true)
      if [ -n "$TOKEN" ] && echo "$TOKEN" | grep -q "^npm_"; then
        echo "//registry.npmjs.org/:_authToken=$TOKEN" > "$NPMRC"
        echo -n "" | pbcopy
        echo "TOKEN_SAVED"
        TOKEN_FOUND=true
        break
      fi
    fi

    # Fallback: check for npm_ token in page text
    NPM_TOKEN=$(echo "$SNAP" | grep -o 'npm_[A-Za-z0-9]*' | head -1 || true)
    if [ -n "$NPM_TOKEN" ]; then
      echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > "$NPMRC"
      echo "TOKEN_SAVED"
      TOKEN_FOUND=true
      break
    fi
  done

  if [ "$TOKEN_FOUND" = false ]; then
    echo "CAPTURE_TIMEOUT"
    exit 1
  fi
fi
