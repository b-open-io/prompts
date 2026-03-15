#!/usr/bin/env bash
# npm-publish: Create a granular access token via agent-browser.
#
# Two modes:
#   setup-token.sh fill    — detect user, navigate, fill form, exit
#   setup-token.sh capture — poll for generated token, write to ~/.npmrc
#
# The agent orchestrates the flow between these two phases,
# communicating with the user in between.
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

  # Snapshot and fill
  SNAPSHOT=$($AB snapshot -i 2>/dev/null || true)

  TOKEN_NAME_REF=$(echo "$SNAPSHOT" | grep -i 'textbox "Token name"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)

  if [ -z "$TOKEN_NAME_REF" ]; then
    echo "FORM_NOT_FOUND"
    exit 1
  fi

  # Fill token name
  $AB fill "@$TOKEN_NAME_REF" "cli-publish" >/dev/null 2>&1 || true

  # Select All packages radio
  ALL_PKG_REF=$(echo "$SNAPSHOT" | grep -i 'radio "All packages"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)
  if [ -n "$ALL_PKG_REF" ]; then
    $AB click "@$ALL_PKG_REF" >/dev/null 2>&1 || true
  fi

  # Scroll down to make permissions and expiration visible
  $AB scroll down 400 >/dev/null 2>&1 || true
  sleep 1

  # Re-snapshot after scroll to get fresh refs for buttons
  SNAPSHOT2=$($AB snapshot -i 2>/dev/null || true)

  # Click Read and Write for packages permissions
  RW_REF=$(echo "$SNAPSHOT2" | grep -i 'button.*Read and write' | head -1 | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)
  if [ -n "$RW_REF" ]; then
    $AB click "@$RW_REF" >/dev/null 2>&1 || true
    sleep 0.5
  fi

  # Scroll more to see expiration
  $AB scroll down 400 >/dev/null 2>&1 || true
  sleep 1
  SNAPSHOT3=$($AB snapshot -i 2>/dev/null || true)

  # Click 7 days expiration
  DAYS_REF=$(echo "$SNAPSHOT3" | grep -i 'button.*7 days' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)
  if [ -n "$DAYS_REF" ]; then
    $AB click "@$DAYS_REF" >/dev/null 2>&1 || true
  fi

  # Scroll to bottom so Generate token button is visible
  $AB scroll down 800 >/dev/null 2>&1 || true

  echo "FORM_READY:$NPM_USER"

elif [ "$MODE" = "capture" ]; then
  # --- PHASE 2: Wait for token, capture via clipboard, write .npmrc ---

  TOKEN_FOUND=false
  for i in $(seq 1 90); do
    sleep 2
    SNAP=$($AB snapshot -i 2>/dev/null || true)

    # After clicking Generate, npm shows the token with a Copy button
    COPY_REF=$(echo "$SNAP" | grep -i 'button.*copy' | head -1 | grep -o 'ref=e[0-9]*' | sed 's/ref=//' || true)

    if [ -n "$COPY_REF" ]; then
      # Found copy button — click it
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
