#!/usr/bin/env bash
# Scan a directory for image files, report sizes/dimensions, flag oversized images.
# Outputs JSON to stdout. No network calls — all analysis is local.
set -euo pipefail

DIR="${1:-.}"
DIR=$(cd "$DIR" && pwd)

has_sips=$(command -v sips >/dev/null 2>&1 && echo "true" || echo "false")

# Collect all image file paths into a temp file, excluding node_modules and .git
tmp_files=$(mktemp)
trap 'rm -f "$tmp_files"' EXIT

find "$DIR" -type f \( \
  -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.gif" \
  -o -iname "*.webp" -o -iname "*.svg" -o -iname "*.avif" \
  \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.next/*" \
  -print0 2>/dev/null | sort -z > "$tmp_files"

# Build JSON entries and collect data for next-gen analysis
images_json=""
total_size=0
oversized_count=0
all_paths=""

while IFS= read -r -d '' file; do
  size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo 0)
  total_size=$((total_size + size))

  ext="${file##*.}"
  format=$(printf '%s' "$ext" | tr '[:upper:]' '[:lower:]')

  dimensions="unknown"
  if [ "$has_sips" = "true" ] && [[ "$format" != "svg" ]]; then
    w=$(sips -g pixelWidth "$file" 2>/dev/null | tail -1 | awk '{print $2}' || true)
    h=$(sips -g pixelHeight "$file" 2>/dev/null | tail -1 | awk '{print $2}' || true)
    if [ -n "$w" ] && [ -n "$h" ] && [ "$w" != "0" ]; then
      dimensions="${w}x${h}"
    fi
  elif [[ "$format" == "svg" ]]; then
    dimensions="vector"
  fi

  oversized="false"
  if [ "$size" -gt 512000 ]; then
    oversized="true"
    oversized_count=$((oversized_count + 1))
  fi

  rel_path="${file#$DIR/}"
  escaped_path=$(printf '%s' "$rel_path" | sed 's/\\/\\\\/g; s/"/\\"/g')

  entry=$(printf '{"path":"%s","size_bytes":%d,"dimensions":"%s","format":"%s","oversized":%s}' \
    "$escaped_path" "$size" "$dimensions" "$format" "$oversized")

  if [ -z "$images_json" ]; then
    images_json="$entry"
  else
    images_json="$images_json,$entry"
  fi

  # Collect for next-gen analysis: basename_no_ext\tformat
  basename_no_ext="${file%.*}"
  rel_base="${basename_no_ext#$DIR/}"
  all_paths="${all_paths}${rel_base}\t${format}\n"

done < "$tmp_files"

if [ -z "$images_json" ]; then
  images_json="[]"
  image_count=0
else
  image_count=$(printf '%s' "$images_json" | tr -cd '{' | wc -c | tr -d ' ')
  images_json="[$images_json]"
fi

# Use python3 for next-gen format detection (handles arbitrary paths safely)
missing_nextgen=$(printf "$all_paths" | python3 -c "
import sys, json

bases = {}
for line in sys.stdin:
    line = line.strip()
    if not line or '\t' not in line:
        continue
    parts = line.split('\t', 1)
    if len(parts) != 2:
        continue
    base, fmt = parts
    if base not in bases:
        bases[base] = set()
    bases[base].add(fmt)

nextgen = {'webp', 'avif'}
missing = []
for base, formats in sorted(bases.items()):
    # Skip if all formats are already next-gen or svg
    non_nextgen = formats - nextgen - {'svg'}
    if not non_nextgen:
        continue
    # Check if a next-gen equivalent exists
    if not (formats & nextgen):
        missing.append(base)

print(json.dumps(missing))
" 2>/dev/null || echo "[]")

cat <<EOF
{
  "images": $images_json,
  "total_size_bytes": $total_size,
  "image_count": $image_count,
  "oversized_count": $oversized_count,
  "missing_nextgen": $missing_nextgen
}
EOF
