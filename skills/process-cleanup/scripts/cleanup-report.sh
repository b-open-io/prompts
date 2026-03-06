#!/usr/bin/env bash
# Investigate running processes, score them by waste, and output structured JSON.
# Outputs JSON to stdout. Progress/status to stderr.
# macOS compatible.
set -euo pipefail

MY_PID=$$
MY_PPID=$PPID

echo >&2 "==> Collecting process snapshot..."
PS_OUTPUT=$(ps -eo pid,ppid,rss,%cpu,lstart,tty,command -m 2>/dev/null | head -101 || true)

echo >&2 "==> Collecting listening ports..."
LSOF_PORTS=$(lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | grep -v "^COMMAND" || true)

echo >&2 "==> Collecting working directories..."
LSOF_CWD=$(lsof -c node -c bun -c next -c python -c ruby -a -d cwd 2>/dev/null || true)

echo >&2 "==> Parsing and scoring processes..."

# Build port map: pid -> port
declare -A PORT_MAP
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  pid=$(echo "$line" | awk '{print $2}')
  port=$(echo "$line" | awk '{print $9}' | sed 's/.*://')
  [[ -n "$pid" && -n "$port" ]] && PORT_MAP["$pid"]="${PORT_MAP[$pid]:-}${PORT_MAP[$pid]:+,}$port"
done <<< "$LSOF_PORTS"

# Build cwd map: pid -> cwd
declare -A CWD_MAP
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  pid=$(echo "$line" | awk '{print $2}')
  path=$(echo "$line" | awk '{print $9}')
  [[ -n "$pid" && -n "$path" ]] && CWD_MAP["$pid"]="$path"
done <<< "$LSOF_CWD"

# Build parent->children map for process tree protection
declare -A CHILDREN_MAP
declare -A PID_PPID_MAP
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*PID ]] && continue
  [[ -z "$line" ]] && continue
  read -r pid ppid _ <<< "$line" 2>/dev/null || continue
  [[ "$pid" =~ ^[0-9]+$ ]] || continue
  PID_PPID_MAP["$pid"]="$ppid"
done <<< "$PS_OUTPUT"

# Collect all PIDs that are in our own process tree (ancestors and descendants)
declare -A PROTECTED_TREE

# Mark ancestors of MY_PID
cur=$MY_PID
for _ in $(seq 1 20); do
  PROTECTED_TREE["$cur"]=1
  parent="${PID_PPID_MAP[$cur]:-0}"
  [[ "$parent" == "0" || "$parent" == "1" ]] && break
  cur="$parent"
done

# Mark descendants: walk PID_PPID_MAP looking for processes whose ppid chain reaches MY_PID
for pid in "${!PID_PPID_MAP[@]}"; do
  cur="$pid"
  for _ in $(seq 1 20); do
    p="${PID_PPID_MAP[$cur]:-0}"
    if [[ "$p" == "$MY_PID" || "$p" == "$MY_PPID" ]]; then
      PROTECTED_TREE["$pid"]=1
      break
    fi
    [[ "$p" == "0" || "$p" == "1" ]] && break
    cur="$p"
  done
done

# Friendly name mapping
friendly_name() {
  local cmd="$1"
  local pid="$2"
  local cwd="${CWD_MAP[$pid]:-}"
  local project=""
  if [[ -n "$cwd" ]]; then
    project=$(basename "$cwd")
  fi

  # Extract project from command args path if no cwd
  if [[ -z "$project" ]]; then
    project=$(echo "$cmd" | grep -oE '/Users/[^/]+/[^/]+/([^/[:space:]]+)' | tail -1 | xargs basename 2>/dev/null || true)
  fi

  local suffix=""
  [[ -n "$project" ]] && suffix=" -> $project"

  # AI CLIs
  if echo "$cmd" | grep -qE '(^| )claude( |$)' && echo "$cmd" | grep -qE '\-\-resume'; then
    echo "Claude Code (resumed session, likely stale)"
  elif echo "$cmd" | grep -qE '(^| )claude( |\-c| |$)' && echo "$cmd" | grep -qE '\-\-claude-in-chrome'; then
    echo "Claude Chrome bridge"
  elif echo "$cmd" | grep -qE '(^| )claude( |\-c| |$)'; then
    echo "Claude Code${suffix}"
  elif echo "$cmd" | grep -qE '(^| )opencode( |$)'; then
    echo "OpenCode${suffix}"
  elif echo "$cmd" | grep -qE '(^| )codex( |$)'; then
    echo "Codex app${suffix}"
  # Dev servers
  elif echo "$cmd" | grep -qE 'next(-router-worker|.*dev)'; then
    local port="${PORT_MAP[$pid]:-}"
    [[ -n "$port" ]] && suffix="$suffix :$port"
    echo "Next.js dev${suffix}"
  elif echo "$cmd" | grep -qE '(^| )bun dev'; then
    local port="${PORT_MAP[$pid]:-}"
    [[ -n "$port" ]] && suffix="$suffix :$port"
    echo "Bun dev${suffix}"
  elif echo "$cmd" | grep -qE '(^| )vite( |$)'; then
    local port="${PORT_MAP[$pid]:-}"
    [[ -n "$port" ]] && suffix="$suffix :$port"
    echo "Vite dev${suffix}"
  elif echo "$cmd" | grep -qE '(^| )convex dev'; then
    echo "Convex dev${suffix}"
  elif echo "$cmd" | grep -qE '(^| )portless( |$)'; then
    echo "Portless proxy${suffix}"
  # Databases
  elif echo "$cmd" | grep -qE '(^| )turso( |$)'; then
    echo "Turso DB"
  elif echo "$cmd" | grep -qE '(postgres|postmaster)'; then
    echo "PostgreSQL"
  elif echo "$cmd" | grep -qE '(^| )redis-server( |$)'; then
    echo "Redis"
  elif echo "$cmd" | grep -qE '(^| )mongod( |$)'; then
    echo "MongoDB"
  # Bundlers / watchers
  elif echo "$cmd" | grep -qE '(webpack|esbuild|turbopack)'; then
    echo "Bundler watcher${suffix}"
  elif echo "$cmd" | grep -qE 'tsc.*--watch'; then
    echo "TypeScript watcher${suffix}"
  # GUI apps
  elif echo "$cmd" | grep -qE 'Google Chrome Helper'; then
    echo "Chrome (renderer)"
  elif echo "$cmd" | grep -qE 'Dia.*Helper'; then
    echo "Dia browser (renderer)"
  elif echo "$cmd" | grep -qE 'Wispr Flow'; then
    echo "Wispr Flow voice"
  elif echo "$cmd" | grep -qE 'iTerm2'; then
    echo "iTerm terminal"
  elif echo "$cmd" | grep -qE '(Electron|Helper \(Renderer\))'; then
    # Derive app name from path
    local app
    app=$(echo "$cmd" | grep -oE '/Applications/[^/]+\.app' | head -1 | xargs basename 2>/dev/null | sed 's/\.app$//' || true)
    [[ -n "$app" ]] && echo "$app" || echo "Electron app"
  else
    # Extract app name from binary path
    local bin
    bin=$(echo "$cmd" | awk '{print $1}')
    local app
    app=$(echo "$bin" | grep -oE '/Applications/[^/]+\.app' | xargs basename 2>/dev/null | sed 's/\.app$//' || true)
    if [[ -n "$app" ]]; then
      echo "$app"
    else
      echo "$(basename "$bin" 2>/dev/null || echo "$bin")"
    fi
  fi
}

# Replaceability score (0-20)
replaceability_score() {
  local cmd="$1"
  # Trivial to restart: AI CLIs, dev servers, watchers -> 15-20
  if echo "$cmd" | grep -qE '(claude|opencode|codex|next.dev|bun.dev|vite|convex.dev|webpack|esbuild|turbopack|tsc.*--watch|portless)'; then
    echo 18
  # Moderate: databases, long builds -> 5-10
  elif echo "$cmd" | grep -qE '(postgres|postmaster|redis-server|mongod|turso)'; then
    echo 7
  # Hard/risky: system services, user sessions -> 0-5
  else
    echo 3
  fi
}

# Safety classification
safety_class() {
  local pid="$1"
  local ppid="$2"
  local cmd="$3"
  local age_hours="$4"
  local uid="$5"
  local my_uid
  my_uid=$(id -u)

  # PROTECTED: own process tree
  if [[ -n "${PROTECTED_TREE[$pid]:-}" ]]; then
    echo "protected"
    return
  fi

  # PROTECTED: system processes (not owned by current user)
  if [[ "$uid" != "$my_uid" ]]; then
    echo "protected"
    return
  fi

  # PROTECTED: active browser
  if echo "$cmd" | grep -qE '(Google Chrome|Dia|Firefox|Safari|Arc)' && ! echo "$cmd" | grep -qE 'Helper'; then
    echo "protected"
    return
  fi

  # PROTECTED: iTerm2 main process
  if echo "$cmd" | grep -qE '^.*/iTerm2' && ! echo "$cmd" | grep -qE 'Helper'; then
    echo "protected"
    return
  fi

  # SAFE: stale AI CLI sessions (old --resume or any AI CLI older than 4 hours)
  if echo "$cmd" | grep -qE '(claude.*--resume|opencode|codex)' && [[ $(echo "$age_hours > 4" | bc 2>/dev/null || echo 0) -eq 1 ]]; then
    echo "safe"
    return
  fi

  # SAFE: orphaned watchers older than 1 hour
  if echo "$cmd" | grep -qE '(webpack|esbuild|turbopack|tsc.*--watch)' && [[ $(echo "$age_hours > 1" | bc 2>/dev/null || echo 0) -eq 1 ]]; then
    echo "safe"
    return
  fi

  # CAUTION: dev servers, databases, anything recent
  if echo "$cmd" | grep -qE '(next.dev|bun.dev|vite|convex.dev|portless|postgres|postmaster|redis-server|mongod|turso)'; then
    echo "caution"
    return
  fi

  # CAUTION: anything started today (< 24 hours)
  if [[ $(echo "$age_hours < 24" | bc 2>/dev/null || echo 1) -eq 1 ]]; then
    echo "caution"
    return
  fi

  echo "safe"
}

# Parse lstart date on macOS: "Fri Feb 14 10:23:45 2025"
parse_age_hours() {
  local lstart="$1"
  local now
  now=$(date +%s)
  # macOS date -j -f
  local start_epoch
  start_epoch=$(date -j -f "%a %b %d %T %Y" "$lstart" +%s 2>/dev/null || echo "")
  if [[ -z "$start_epoch" ]]; then
    # fallback: unknown age -> 0 hours (treat as fresh/caution)
    echo "0"
    return
  fi
  echo "$(( (now - start_epoch) / 3600 ))"
}

# Process output JSON arrays
safe_procs="[]"
caution_procs="[]"
protected_procs="[]"
total_safe_mb=0

# Track seen PIDs to avoid duplicates from ps header or blank lines
declare -A SEEN_PIDS

skip_header=1
while IFS= read -r line; do
  # Skip header line
  if [[ $skip_header -eq 1 ]]; then
    skip_header=0
    continue
  fi
  [[ -z "$line" ]] && continue

  # ps -eo pid,ppid,rss,%cpu,lstart,tty,command
  # lstart is 5 fields: "Fri Feb 14 10:23:45 2025"
  # So layout: pid ppid rss %cpu DOW MON DD HH:MM:SS YYYY tty command...
  read -r pid ppid rss cpu dow mon dd hms yr tty rest <<< "$line" 2>/dev/null || continue
  [[ "$pid" =~ ^[0-9]+$ ]] || continue
  [[ -n "${SEEN_PIDS[$pid]:-}" ]] && continue
  SEEN_PIDS["$pid"]=1

  lstart="$dow $mon $dd $hms $yr"
  cmd=$(echo "$line" | awk '{for(i=12;i<=NF;i++) printf $i" "; print ""}' | sed 's/ $//')
  [[ -z "$cmd" ]] && cmd="$rest"

  # Get UID for ownership check
  uid=$(ps -p "$pid" -o uid= 2>/dev/null | tr -d ' ' || echo "0")

  # Memory in MB (rss is in KB)
  mem_mb=$(( rss / 1024 ))

  # Age
  age_hours=$(parse_age_hours "$lstart")

  # Resource score (0-40)
  if [[ $mem_mb -lt 100 ]]; then
    res_score=$(( mem_mb / 20 ))   # 0-5
  elif [[ $mem_mb -lt 500 ]]; then
    res_score=$(( 5 + (mem_mb - 100) * 10 / 400 ))   # 5-15
  elif [[ $mem_mb -lt 1024 ]]; then
    res_score=$(( 15 + (mem_mb - 500) * 10 / 524 ))   # 15-25
  elif [[ $mem_mb -lt 2048 ]]; then
    res_score=$(( 25 + (mem_mb - 1024) * 10 / 1024 ))  # 25-35
  else
    res_score=38
  fi
  [[ $res_score -gt 40 ]] && res_score=40

  # Staleness score (0-40)
  if [[ $age_hours -lt 1 ]]; then
    stale_score=0
  elif [[ $age_hours -lt 24 ]]; then
    stale_score=$(( 5 + age_hours * 5 / 24 ))   # 5-10
  elif [[ $age_hours -lt 72 ]]; then
    stale_score=$(( 10 + (age_hours - 24) * 10 / 48 ))  # 10-20
  elif [[ $age_hours -lt 168 ]]; then
    stale_score=$(( 20 + (age_hours - 72) * 10 / 96 ))  # 20-30
  else
    stale_score=38
  fi
  [[ $stale_score -gt 40 ]] && stale_score=40

  rep_score=$(replaceability_score "$cmd")
  total_score=$(( res_score + stale_score + rep_score ))
  [[ $total_score -gt 100 ]] && total_score=100

  name=$(friendly_name "$cmd" "$pid")
  port="${PORT_MAP[$pid]:-}"
  class=$(safety_class "$pid" "$ppid" "$cmd" "$age_hours" "$uid")

  # Escape name for JSON
  name_escaped=$(echo "$name" | sed 's/"/\\"/g')
  port_json="null"
  [[ -n "$port" ]] && port_json="\"$port\""

  entry="{\"pid\":$pid,\"name\":\"$name_escaped\",\"memory_mb\":$mem_mb,\"age_hours\":$age_hours,\"score\":$total_score,\"port\":$port_json}"

  case "$class" in
    safe)
      if [[ "$safe_procs" == "[]" ]]; then
        safe_procs="[$entry"
      else
        safe_procs="$safe_procs,$entry"
      fi
      total_safe_mb=$(( total_safe_mb + mem_mb ))
      ;;
    caution)
      if [[ "$caution_procs" == "[]" ]]; then
        caution_procs="[$entry"
      else
        caution_procs="$caution_procs,$entry"
      fi
      ;;
    protected)
      if [[ "$protected_procs" == "[]" ]]; then
        protected_procs="[$entry"
      else
        protected_procs="$protected_procs,$entry"
      fi
      ;;
  esac
done <<< "$PS_OUTPUT"

# Close arrays
[[ "$safe_procs" != "[]" ]] && safe_procs="$safe_procs]"
[[ "$caution_procs" != "[]" ]] && caution_procs="$caution_procs]"
[[ "$protected_procs" != "[]" ]] && protected_procs="$protected_procs]"

# Build kill command from safe PIDs
kill_pids=""
if [[ "$safe_procs" != "[]" ]]; then
  kill_pids=$(echo "$safe_procs" | grep -oE '"pid":[0-9]+' | grep -oE '[0-9]+' | tr '\n' ' ' | sed 's/ $//')
fi
kill_cmd="null"
[[ -n "$kill_pids" ]] && kill_cmd="\"kill $kill_pids\""

echo >&2 "==> Done. Total recoverable: ${total_safe_mb} MB"

cat <<EOF
{
  "my_pid": $MY_PID,
  "total_recoverable_mb": $total_safe_mb,
  "safe": $safe_procs,
  "caution": $caution_procs,
  "protected": $protected_procs,
  "kill_command": $kill_cmd
}
EOF
