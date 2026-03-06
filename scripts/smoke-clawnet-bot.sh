#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "usage: $0 <bot-url> [directory]"
  exit 1
fi

BOT_URL="${1%/}"

echo "== root =="
curl -fsS "$BOT_URL/" | jq .

echo
echo "== heartbeat =="
curl -fsS "$BOT_URL/api/heartbeat" | jq .

if [ "${2:-}" = "directory" ]; then
  echo
  echo "== directory =="
  curl -fsS "$BOT_URL/directory" | jq .
fi
