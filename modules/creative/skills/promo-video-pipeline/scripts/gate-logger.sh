#!/usr/bin/env bash
# gate-logger.sh — spend and tamper gate for the headless promo-video run.
#
# Start it detached before the coding model runs. It refuses any hf-api that
# is not byte-identical to the wrapper shipped beside it (installed as
# <state>/bin/hf-api, with <state>/key, <state>/ledger.jsonl, and --dir
# <state>/gate). It snapshots the wrapper and ledger, copies <state>/prices.json
# and <state>/budget (which must hold --budget) into <dir> with their sha256 in
# <dir>/snapshot.json for hf-api to check on every generate, writes <dir>/ready
# (its PID) once every precondition holds, then watches the run until it ends:
#   - arms the run (<dir>/armed) only after the stream's system/init event
#     shows the expected model, 0 MCP servers, and 0 skills; hf-api generate
#     must refuse unless <dir>/armed exists and names a live gate PID
#   - logs every ledger entry (every hf-api call that spends or refunds)
#   - trips on a changed hf-api binary, prices.json, budget, or snapshot, a
#     rewritten or malformed ledger,
#     Higgsfield spend over --budget, a tool call before the init check, or a
#     tool call that names the key, ledger, wrapper, gate dir, or the
#     Higgsfield API host (also after shell quotes and backslashes are removed,
#     so k''ey or higgs"field".ai still match)
# The tripwire is a backstop, not the boundary: the launcher runs the model in
# the Claude Code sandbox, which denies the state dir and all network egress.
# Portable to BSD userland (macOS): no head -c 0, realpath -m, or sed -i.
# A trip removes <dir>/armed, writes the reason to <dir>/tripped, and kills
# the run's process group (<dir>/run.pid). Exit: 0 run ended, 2 bad input,
# 3 tripped.
#
# Ledger contract: JSONL, one object per hf-api call, with a numeric
# cost_usd (the estimate for a generate, negative for a refunded cancel).

set -euo pipefail

usage() {
  echo "usage: gate-logger.sh --dir DIR --hf-api PATH --ledger PATH --key PATH --budget USD --stream PATH [--model ID]" >&2
  exit 2
}

GATE="" HF="" LEDGER="" KEY="" BUDGET="" STREAM="" MODEL="claude-opus-5-5"
while [[ $# -gt 0 ]]; do
  [[ $# -ge 2 ]] || usage
  case "$1" in
    --dir) GATE=$2 ;;
    --hf-api) HF=$2 ;;
    --ledger) LEDGER=$2 ;;
    --key) KEY=$2 ;;
    --budget) BUDGET=$2 ;;
    --stream) STREAM=$2 ;;
    --model) MODEL=$2 ;;
    *) usage ;;
  esac
  shift 2
done

fail() { trap - EXIT; echo "gate-logger: $*" >&2; exit 2; }
# BSD head rejects -c 0.
head_bytes() { if (( $1 > 0 )); then head -c "$1" ${2:+"$2"}; else cat > /dev/null 2>&1 < "${2:-/dev/stdin}" || true; fi; }
# realpath -m is GNU-only; resolve the parent directory instead.
real_of() { local d; d=$(cd "$(dirname "$1")" 2>/dev/null && pwd -P) && printf '%s/%s' "$d" "$(basename "$1")"; }
for v in GATE HF LEDGER KEY BUDGET STREAM; do [[ -n ${!v} ]] || usage; done
for p in "$GATE" "$HF" "$LEDGER" "$KEY" "$STREAM"; do [[ $p == /* ]] || fail "$p must be an absolute path"; done
command -v jq >/dev/null || fail "jq is required"
if command -v sha256sum >/dev/null; then hash_of() { sha256sum | cut -d' ' -f1; }
elif command -v shasum >/dev/null; then hash_of() { shasum -a 256 | cut -d' ' -f1; }
else fail "sha256sum or shasum is required"; fi
[[ $BUDGET =~ ^[0-9]+(\.[0-9]+)?$ ]] && jq -en "$BUDGET > 0" >/dev/null || fail "--budget must be a positive USD amount"
[[ -f $HF && -x $HF ]] || fail "hf-api wrapper $HF is missing or not executable"
# Only the wrapper shipped beside this gate enforces the armed check and the
# budget in code, so any other hf-api is refused, whatever it claims.
SHIPPED="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/hf-api"
[[ -f $SHIPPED ]] || fail "shipped wrapper $SHIPPED is missing"
[[ $(hash_of < "$HF") == "$(hash_of < "$SHIPPED")" ]] || fail "$HF is not the hf-api shipped with this skill (sha256 differs)"
state=$(dirname "$LEDGER")
[[ $HF == "$state/bin/hf-api" && $KEY == "$state/key" && $GATE == "$state/gate" ]] \
  || fail "hf-api must be installed as $state/bin/hf-api, with its key at $state/key and --dir $state/gate"
[[ -f $LEDGER ]] || fail "ledger $LEDGER is missing (create it empty first)"
[[ -f $KEY ]] || fail "key file $KEY is missing"
[[ -f $STREAM ]] || fail "stream $STREAM is missing (create it empty first)"
PRICES="$state/prices.json" BUDGET_FILE="$state/budget"
jq -e 'type == "object" and length > 0' "$PRICES" > /dev/null 2>&1 || fail "$PRICES is missing or not a price table"
[[ -f $BUDGET_FILE ]] && jq -en --argjson f "$(tr -d '[:space:]' < "$BUDGET_FILE")" "\$f == $BUDGET" > /dev/null 2>&1 \
  || fail "$BUDGET_FILE must hold the --budget amount ($BUDGET)"

mkdir -p "$GATE" || fail "cannot create $GATE"
rm -f "$GATE/ready" "$GATE/armed" "$GATE/tripped" "$GATE/run.pid" "$GATE/snapshot.json" "$GATE/prices.json" "$GATE/budget"
LOG="$GATE/gate.log"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG"; }

spent() { jq -en '[inputs | .cost_usd | if type == "number" then . else error("cost_usd") end] | add // 0' "$LEDGER" 2>/dev/null; }

stop_run() {
  local pid
  pid=$(cat "$GATE/run.pid" 2>/dev/null || true)
  if [[ $pid =~ ^[0-9]+$ ]]; then
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  fi
}

trip() {
  trap - EXIT
  rm -f "$GATE/armed"
  printf '%s\n' "$*" > "$GATE/tripped" || true
  log "TRIP: $*" || true
  stop_run
  exit 3
}

# Any exit other than a clean "run ended" (an unexpected error under set -e,
# or a signal) disarms spend and kills the run.
on_exit() {
  local rc=$?
  rm -f "$GATE/armed"
  [[ -f $GATE/tripped ]] || printf 'gate exited unexpectedly (status %s)\n' "$rc" > "$GATE/tripped" || true
  log "TRIP: gate exited unexpectedly (status $rc)" || true
  stop_run
}
trap on_exit EXIT
trap 'trip "gate stopped by a signal"' INT TERM HUP

hf_hash=$(hash_of < "$HF")
prices_hash=$(hash_of < "$PRICES")
budget_hash=$(hash_of < "$BUDGET_FILE")
cp "$PRICES" "$GATE/prices.json" && cp "$BUDGET_FILE" "$GATE/budget" && chmod 0400 "$GATE/prices.json" "$GATE/budget"
jq -n --arg h "$hf_hash" --arg p "$prices_hash" --arg b "$budget_hash" '{hf_api: $h, prices: $p, budget: $b}' > "$GATE/snapshot.tmp"
mv "$GATE/snapshot.tmp" "$GATE/snapshot.json" && chmod 0400 "$GATE/snapshot.json"
snap_hash=$(hash_of < "$GATE/snapshot.json")
ledger_off=$(wc -c < "$LEDGER" | tr -d ' ')
ledger_hash=$(head_bytes "$ledger_off" "$LEDGER" | hash_of)
total=$(spent) || fail "ledger $LEDGER is malformed"
jq -en "$total <= $BUDGET" >/dev/null || fail "ledger already shows \$$total, over the \$$BUDGET budget"
stream_off=0
armed=0
ending=0

log "ready pid=$$ model=$MODEL budget=$BUDGET spent=$total hf-api=$hf_hash"
printf '%s\n' "$$" > "$GATE/ready.tmp" && mv "$GATE/ready.tmp" "$GATE/ready"

# Complete lines appended to $1 since byte offset $2, written to $GATE/chunk;
# prints the new offset.
take() {
  local size partial=0
  size=$(wc -c < "$1" | tr -d ' ')
  (( size < $2 )) && return 1
  tail -c +"$(($2 + 1))" "$1" | head_bytes "$((size - $2))" > "$GATE/chunk"
  if [[ -s $GATE/chunk && $(tail -c 1 "$GATE/chunk" | od -An -c | tr -d ' ') != '\n' ]]; then
    partial=$(tail -n 1 "$GATE/chunk" | wc -c | tr -d ' ')
  fi
  head_bytes "$((size - $2 - partial))" "$GATE/chunk" > "$GATE/chunk.lines"
  echo "$((size - partial))"
}

# Protected names match only as whole path tokens: "key" matches `cat key` or
# `~/.hf-api/key` but not `keyframes/`.
quote_re() { printf '%s' "$1" | sed 's/[][\.*^$+?(){}|]/\\&/g'; }
protected=()
for p in "$KEY" "$LEDGER" "$HF" "$GATE"; do
  protected+=("$p" "$(basename "$p")")
  real=$(real_of "$p" || true)
  [[ -n $real ]] && protected+=("$real")
  if [[ -n ${HOME:-} && $p == "$HOME"/* ]]; then
    protected+=("~/${p#"$HOME"/}" "\$HOME/${p#"$HOME"/}" "\${HOME}/${p#"$HOME"/}")
  fi
done
edge='[^A-Za-z0-9._-]'
forbidden_re=""
for p in "${protected[@]}"; do
  forbidden_re+="${forbidden_re:+|}(^|$edge)$(quote_re "$p")(\$|$edge)"
done

forbidden_one() {
  [[ $1 =~ $forbidden_re ]] || [[ $1 == *higgsfield.ai* || $1 == *"Authorization: Key"* ]]
}
names_forbidden() {
  local bare=${1//[\'\"\\]/}
  forbidden_one "$1" || forbidden_one "$bare"
}

while :; do
  [[ $(hash_of < "$HF") == "$hf_hash" ]] || trip "hf-api wrapper changed"
  [[ $(hash_of < "$PRICES") == "$prices_hash" && $(hash_of < "$GATE/prices.json") == "$prices_hash" ]] || trip "prices.json changed"
  [[ $(hash_of < "$BUDGET_FILE") == "$budget_hash" && $(hash_of < "$GATE/budget") == "$budget_hash" ]] || trip "budget changed"
  [[ $(hash_of < "$GATE/snapshot.json") == "$snap_hash" ]] || trip "gate snapshot changed"

  off=$(take "$LEDGER" "$ledger_off") || trip "ledger shrank"
  [[ $(head_bytes "$ledger_off" "$LEDGER" | hash_of) == "$ledger_hash" ]] || trip "ledger rewritten"
  if [[ $off != "$ledger_off" ]]; then
    while IFS= read -r entry; do log "hf-api: $entry"; done < "$GATE/chunk.lines"
    ledger_off=$off
    ledger_hash=$(head_bytes "$ledger_off" "$LEDGER" | hash_of)
    total=$(spent) || trip "ledger malformed"
    jq -en "$total <= $BUDGET" >/dev/null || trip "Higgsfield spend \$$total is over the \$$BUDGET budget"
  fi

  off=$(take "$STREAM" "$stream_off") || trip "stream truncated"
  if [[ $off != "$stream_off" ]]; then
    stream_off=$off
    events=$(jq -Rr 'fromjson? // {type: "unparsed"}
      | if .type == "unparsed" then "bad"
        elif .type == "system" and .subtype == "init" then
          "init\t\(.model)\t\(.mcp_servers // [] | length)\t\(.skills // [] | length)"
        elif .type == "assistant" then
          (.message.content[]? | select(.type == "tool_use") | "tool\t\(.name)\t\(.input | tojson)")
        else empty end' "$GATE/chunk.lines") || trip "cannot parse the stream"
    while IFS=$'\t' read -r kind a b c; do
      case $kind in
        bad) trip "unparseable stream line" ;;
        init)
          (( armed == 0 )) || trip "second init event"
          [[ $a == "$MODEL" && $b == 0 && $c == 0 ]] || trip "init shows model=$a mcp=$b skills=$c"
          printf '%s\n' "$$" > "$GATE/armed.tmp" && mv "$GATE/armed.tmp" "$GATE/armed"
          armed=1
          log "armed: model=$a mcp=0 skills=0"
          ;;
        tool)
          (( armed == 1 )) || trip "tool call before the init check"
          names_forbidden "$b" && trip "$a call names a protected path or the Higgsfield API: $b"
          log "tool: $a $b"
          ;;
      esac
    done <<< "$events"
  fi

  pid=$(cat "$GATE/run.pid" 2>/dev/null || true)
  if [[ $pid =~ ^[0-9]+$ ]] && ! kill -0 "$pid" 2>/dev/null; then
    # One more pass picks up ledger and stream lines written just before the exit.
    (( ending == 1 )) || { ending=1; continue; }
    (( armed == 1 )) || trip "run ended before the init check"
    trap - EXIT
    rm -f "$GATE/armed"
    log "run ended; spent=$total"
    exit 0
  fi
  sleep 1
done
