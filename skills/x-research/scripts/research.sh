#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
models_file=""
print_request=false

usage() {
  echo "Usage: research.sh [--models-file PATH] [--print-request] < request.json" >&2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --models-file)
      [ "$#" -ge 2 ] || { usage; exit 2; }
      models_file="$2"
      shift 2
      ;;
    --print-request)
      print_request=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

payload=$(cat)
if ! jq -e 'type == "object"' >/dev/null 2>&1 <<<"$payload"; then
  echo "ERROR: request input must be one JSON object" >&2
  exit 1
fi

if [ -n "$models_file" ]; then
  model=$("$SCRIPT_DIR/select-model.sh" --models-file "$models_file")
else
  model=$("$SCRIPT_DIR/select-model.sh")
fi
request=$(jq -c --arg model "$model" '.model = $model' <<<"$payload")
echo "Using xAI research model: $model" >&2

if [ "$print_request" = true ]; then
  jq . <<<"$request"
  exit 0
fi

: "${XAI_API_KEY:?Set XAI_API_KEY before running xAI research}"
curl -fsS https://api.x.ai/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  --data-binary "$request"
