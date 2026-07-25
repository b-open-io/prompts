#!/usr/bin/env bash
# Analyze JS/CSS bundle sizes in build output directories.
# Outputs JSON to stdout. No network calls — all analysis is local.
set -euo pipefail

DIR="${1:-.}"
DIR=$(cd "$DIR" && pwd)

# Detect build output directories
build_dirs=()
for candidate in ".next" "dist" "build" "out" ".output"; do
  if [ -d "$DIR/$candidate" ]; then
    build_dirs+=("$candidate")
  fi
done

if [ ${#build_dirs[@]} -eq 0 ]; then
  cat <<EOF
{
  "error": "no_build_output",
  "message": "No build output found. Run a build first. Searched: .next, dist, build, out, .output",
  "bundles": [],
  "total_js_bytes": 0,
  "total_css_bytes": 0,
  "has_sourcemaps": false,
  "build_dirs": []
}
EOF
  exit 0
fi

bundles_json=""
total_js=0
total_css=0
has_sourcemaps="false"

for build_dir in "${build_dirs[@]}"; do
  full_dir="$DIR/$build_dir"

  # Find JS files
  while IFS= read -r -d '' file; do
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
    total_js=$((total_js + size))

    # Gzip size estimate
    gzipped=0
    if command -v gzip >/dev/null 2>&1; then
      gzipped=$(gzip -c "$file" 2>/dev/null | wc -c | tr -d ' ')
    fi

    rel_path="${file#$DIR/}"
    escaped_path=$(printf '%s' "$rel_path" | sed 's/\\/\\\\/g; s/"/\\"/g')

    entry=$(printf '{"path":"%s","size_bytes":%d,"gzipped_bytes":%d,"type":"js"}' \
      "$escaped_path" "$size" "$gzipped")

    if [ -z "$bundles_json" ]; then
      bundles_json="$entry"
    else
      bundles_json="$bundles_json,$entry"
    fi
  done < <(find "$full_dir" -type f -name "*.js" ! -name "*.map.js" -print0 2>/dev/null | sort -z)

  # Find CSS files
  while IFS= read -r -d '' file; do
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
    total_css=$((total_css + size))

    gzipped=0
    if command -v gzip >/dev/null 2>&1; then
      gzipped=$(gzip -c "$file" 2>/dev/null | wc -c | tr -d ' ')
    fi

    rel_path="${file#$DIR/}"
    escaped_path=$(printf '%s' "$rel_path" | sed 's/\\/\\\\/g; s/"/\\"/g')

    entry=$(printf '{"path":"%s","size_bytes":%d,"gzipped_bytes":%d,"type":"css"}' \
      "$escaped_path" "$size" "$gzipped")

    if [ -z "$bundles_json" ]; then
      bundles_json="$entry"
    else
      bundles_json="$bundles_json,$entry"
    fi
  done < <(find "$full_dir" -type f -name "*.css" ! -name "*.map" -print0 2>/dev/null | sort -z)

  # Check for source maps
  map_count=$(find "$full_dir" -type f \( -name "*.js.map" -o -name "*.css.map" \) 2>/dev/null | wc -l | tr -d ' ')
  if [ "$map_count" -gt 0 ]; then
    has_sourcemaps="true"
  fi
done

# Sort bundles by size (largest first) using a simple approach
# Build the array — sorting is left to the consumer since we output JSON
if [ -z "$bundles_json" ]; then
  bundles_json="[]"
else
  bundles_json="[$bundles_json]"
fi

# Build dirs as JSON array
build_dirs_json=""
for d in "${build_dirs[@]}"; do
  if [ -z "$build_dirs_json" ]; then
    build_dirs_json="\"$d\""
  else
    build_dirs_json="$build_dirs_json,\"$d\""
  fi
done

cat <<EOF
{
  "bundles": $bundles_json,
  "total_js_bytes": $total_js,
  "total_css_bytes": $total_css,
  "has_sourcemaps": $has_sourcemaps,
  "build_dirs": [$build_dirs_json]
}
EOF
