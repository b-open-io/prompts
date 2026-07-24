#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: select-model.sh [--models-file PATH]" >&2
}

models_file=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --models-file)
      [ "$#" -ge 2 ] || { usage; exit 2; }
      models_file="$2"
      shift 2
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

command -v jq >/dev/null 2>&1 || {
  echo "ERROR: jq is required to select an xAI model" >&2
  exit 1
}

if [ -n "$models_file" ]; then
  [ -r "$models_file" ] || {
    echo "ERROR: models file is not readable: $models_file" >&2
    exit 1
  }
  models_json=$(<"$models_file")
else
  : "${XAI_API_KEY:?Set XAI_API_KEY before selecting an xAI model}"
  command -v curl >/dev/null 2>&1 || {
    echo "ERROR: curl is required to query the xAI model catalog" >&2
    exit 1
  }
  models_json=$(curl -fsS https://api.x.ai/v1/models \
    -H "Authorization: Bearer $XAI_API_KEY")
fi

if ! jq -e '.data | type == "array"' >/dev/null 2>&1 <<<"$models_json"; then
  echo "ERROR: xAI model catalog response does not contain a data array" >&2
  exit 1
fi

requested=${XAI_RESEARCH_MODEL:-auto}
case "$requested" in
  ""|auto|latest|grok-latest|grok-4-latest)
    selected=$(jq -r '
      [.data[]
        | select(.id | type == "string")
        | select(.id | test("^grok-[0-9]+([.][0-9]+)*$"))]
      | sort_by([(.created // 0), .id])
      | last
      | .id // empty
    ' <<<"$models_json")
    if [ -z "$selected" ]; then
      echo "ERROR: no canonical general-purpose Grok model was found; set XAI_RESEARCH_MODEL to a verified model ID" >&2
      exit 1
    fi
    ;;
  *)
    selected=$(jq -r --arg requested "$requested" '
      [.data[]
        | select(
            .id == $requested
            or ((.aliases // []) | index($requested) != null)
          )]
      | first
      | .id // empty
    ' <<<"$models_json")
    if [ -z "$selected" ]; then
      echo "ERROR: XAI_RESEARCH_MODEL '$requested' is not available to this API key" >&2
      exit 1
    fi
    ;;
esac

printf '%s\n' "$selected"
