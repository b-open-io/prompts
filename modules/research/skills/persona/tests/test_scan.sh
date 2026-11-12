#!/usr/bin/env bash
# scan.sh model selection: a fresh cache survives a catalog outage, and no request below the
# grok-4.7 floor reaches xAI. curl is stubbed; nothing touches the network.
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SCAN="$SCRIPT_DIR/../scripts/scan.sh"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

mkdir -p "$TMP_DIR/bin"
cat >"$TMP_DIR/bin/curl" <<'STUB'
#!/usr/bin/env bash
echo "$*" >>"$STUB_CALLS"
case "$*" in
  *api.x.ai/v1/models*)
    [ "$STUB_CATALOG" = fail ] && { echo "curl: (22) The requested URL returned error: 503" >&2; exit 22; }
    cat "$STUB_CATALOG"
    ;;
  *api.x.ai/v1/responses*)
    while [ "$#" -gt 0 ]; do
      [ "$1" = -d ] && printf '%s' "$2" >"$STUB_REQUEST"
      shift
    done
    printf '%s' '{"output":[{"type":"message","content":[{"text":"TECHNICAL DEVELOPMENTS\nshipped\n---\nCONTENT OPPORTUNITIES\nask\n---\nNOTABLE ACTIVITY\nlaunch\n---\nEARLY SIGNALS\nsignal"}]}]}'
    ;;
  *) echo "unexpected curl call: $*" >&2; exit 9 ;;
esac
STUB
chmod +x "$TMP_DIR/bin/curl"

cat >"$TMP_DIR/catalog.json" <<'JSON'
{"data":[
  {"id": "grok-4.7", "aliases": [], "created": 1782691200},
  {"id": "grok-4.6", "aliases": ["grok-latest"], "created": 1900000000}
]}
JSON

# run_scan CASE CATALOG [env assignments...] -- [scan args...]; sets status, leaves out/err/calls in $TMP_DIR/CASE.
run_scan() {
  local case_dir="$TMP_DIR/$1" catalog=$2
  shift 2
  mkdir -p "$case_dir/persona"
  : >"$case_dir/calls"
  local assignments=()
  while [ "$#" -gt 0 ] && [ "$1" != -- ]; do assignments+=("$1"); shift; done
  [ "$#" -gt 0 ] && shift
  set +e
  env -u XAI_RESEARCH_MODEL PATH="$TMP_DIR/bin:$PATH" XAI_API_KEY=test-key PERSONA_DIR="$case_dir/persona" \
    STUB_CALLS="$case_dir/calls" STUB_CATALOG="$catalog" STUB_REQUEST="$case_dir/request.json" \
    ${assignments[@]+"${assignments[@]}"} bash "$SCAN" --topics "AI agents" "$@" >"$case_dir/out" 2>"$case_dir/err"
  status=$?
  set -e
}

# stat stubs for the dialect this host does not have. GNU `stat -f` prints filesystem details
# to stdout and then fails; BSD `stat -c` fails without output. Both report a fresh mtime.
mkdir -p "$TMP_DIR/gnu-stat" "$TMP_DIR/bsd-stat" "$TMP_DIR/junk-stat"
cat >"$TMP_DIR/gnu-stat/stat" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  -c) date +%s ;;
  -f) printf '  File: "%s"\n    ID: 0 Namelen: 255     Type: ext2/ext3\n' "$3"; exit 1 ;;
  *) exit 1 ;;
esac
STUB
cat >"$TMP_DIR/bsd-stat/stat" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  -f) date +%s ;;
  *) echo "stat: illegal option -- ${1#-}" >&2; exit 1 ;;
esac
STUB
cat >"$TMP_DIR/junk-stat/stat" <<'STUB'
#!/usr/bin/env bash
echo "not-a-number"
STUB
chmod +x "$TMP_DIR/gnu-stat/stat" "$TMP_DIR/bsd-stat/stat" "$TMP_DIR/junk-stat/stat"

# 1. A fresh cache is returned during a catalog outage, without any network call, whichever
#    stat dialect the host has.
for dialect in native gnu bsd; do
  mkdir -p "$TMP_DIR/fresh-$dialect/persona"
  echo '{"cached":true}' >"$TMP_DIR/fresh-$dialect/persona/last-scan.json"
  stat_path=$PATH
  [ "$dialect" = native ] || stat_path="$TMP_DIR/$dialect-stat:$PATH"
  run_scan "fresh-$dialect" fail XAI_RESEARCH_MODEL=grok-4.7 PATH="$TMP_DIR/bin:$stat_path"
  [ "$status" -eq 0 ] || fail "$dialect stat: fresh cache with catalog outage exited $status: $(cat "$TMP_DIR/fresh-$dialect/err")"
  [ "$(cat "$TMP_DIR/fresh-$dialect/out")" = '{"cached":true}' ] || fail "$dialect stat: fresh cache was not returned: $(cat "$TMP_DIR/fresh-$dialect/out")"
  [ ! -s "$TMP_DIR/fresh-$dialect/calls" ] || fail "$dialect stat: fresh cache still called curl: $(cat "$TMP_DIR/fresh-$dialect/calls")"
done

# 1b. Unparseable stat output counts as a stale cache instead of breaking the age arithmetic.
mkdir -p "$TMP_DIR/junk/persona"
echo '{"cached":true}' >"$TMP_DIR/junk/persona/last-scan.json"
run_scan junk fail XAI_RESEARCH_MODEL=grok-4.7 PATH="$TMP_DIR/bin:$TMP_DIR/junk-stat:$PATH"
[ "$status" -ne 0 ] || fail "junk stat output should not return the cache"
grep -q "catalog\|error" "$TMP_DIR/junk/err" || fail "junk stat: unexpected error: $(cat "$TMP_DIR/junk/err")"
if grep -q "line [0-9]*:" "$TMP_DIR/junk/err"; then fail "junk stat broke the script: $(cat "$TMP_DIR/junk/err")"; fi

# 2. With no usable cache, a catalog outage fails before any research request.
run_scan outage fail
[ "$status" -ne 0 ] || fail "catalog outage without a cache should fail"
if grep -q "v1/responses" "$TMP_DIR/outage/calls"; then fail "research request sent after a catalog outage"; fi

# 3. A Grok 4.6 pin is refused before any research request, even with --refresh over a fresh cache.
mkdir -p "$TMP_DIR/pinned/persona"
echo '{"cached":true}' >"$TMP_DIR/pinned/persona/last-scan.json"
run_scan pinned "$TMP_DIR/catalog.json" XAI_RESEARCH_MODEL=grok-4.6 -- --refresh
[ "$status" -ne 0 ] || fail "grok-4.6 pin should fail"
grep -q "at or above grok-4.7" "$TMP_DIR/pinned/err" || fail "grok-4.6 pin error: $(cat "$TMP_DIR/pinned/err")"
if grep -q "v1/responses" "$TMP_DIR/pinned/calls"; then fail "grok-4.6 pin reached the research API"; fi

# 4. Unset, the scan selects grok-4.7 even when the catalog dates grok-4.6 newer, then caches.
run_scan auto "$TMP_DIR/catalog.json"
[ "$status" -eq 0 ] || fail "automatic scan exited $status: $(cat "$TMP_DIR/auto/err")"
[ "$(jq -r .model "$TMP_DIR/auto/request.json")" = grok-4.7 ] || fail "automatic scan sent $(jq -r .model "$TMP_DIR/auto/request.json")"
jq -e '.trending == "shipped" and .early_signals == "signal"' "$TMP_DIR/auto/out" >/dev/null || fail "unexpected scan output: $(cat "$TMP_DIR/auto/out")"
cmp -s "$TMP_DIR/auto/out" "$TMP_DIR/auto/persona/last-scan.json" || fail "scan result was not cached"

echo "PASS: persona scan model selection"
