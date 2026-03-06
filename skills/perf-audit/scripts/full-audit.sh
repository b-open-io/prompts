#!/usr/bin/env bash
# Run all perf audits in parallel and merge into a unified JSON report.
# Outputs JSON to stdout. No network calls — all analysis is local.
set -euo pipefail

DIR="${1:-.}"
DIR=$(cd "$DIR" && pwd)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Create temp files for parallel output
tmp_image=$(mktemp)
tmp_bundle=$(mktemp)
tmp_dep=$(mktemp)
trap 'rm -f "$tmp_image" "$tmp_bundle" "$tmp_dep"' EXIT

# Run all three audits in parallel
bash "$SCRIPT_DIR/image-audit.sh" "$DIR" > "$tmp_image" 2>/dev/null &
pid_image=$!

bash "$SCRIPT_DIR/bundle-audit.sh" "$DIR" > "$tmp_bundle" 2>/dev/null &
pid_bundle=$!

bash "$SCRIPT_DIR/dep-audit.sh" "$DIR" > "$tmp_dep" 2>/dev/null &
pid_dep=$!

# Wait for all
wait $pid_image $pid_bundle $pid_dep 2>/dev/null || true

# Read results
image_result=$(cat "$tmp_image")
bundle_result=$(cat "$tmp_bundle")
dep_result=$(cat "$tmp_dep")

# Calculate health score (0-100)
# Start at 100, deduct points for issues
python3 -c "
import json, sys

score = 100

try:
    images = json.loads('''$image_result''')
except:
    images = {'oversized_count': 0, 'total_size_bytes': 0, 'missing_nextgen': [], 'images': [], 'image_count': 0}

try:
    bundles = json.loads('''$bundle_result''')
except:
    bundles = {'total_js_bytes': 0, 'total_css_bytes': 0, 'has_sourcemaps': False, 'bundles': [], 'build_dirs': []}

try:
    deps = json.loads('''$dep_result''')
except:
    deps = {'heavy_deps': [], 'total_deps': 0, 'total_dev_deps': 0}

# Deduct for oversized images (-5 each, max -25)
oversized = images.get('oversized_count', 0)
score -= min(oversized * 5, 25)

# Deduct for missing next-gen formats (-2 each, max -15)
missing = len(images.get('missing_nextgen', []))
score -= min(missing * 2, 15)

# Deduct for total image weight > 5MB (-10), > 10MB (-20)
img_mb = images.get('total_size_bytes', 0) / (1024 * 1024)
if img_mb > 10:
    score -= 20
elif img_mb > 5:
    score -= 10

# Deduct for total JS > 1MB (-10), > 2MB (-20)
js_mb = bundles.get('total_js_bytes', 0) / (1024 * 1024)
if js_mb > 2:
    score -= 20
elif js_mb > 1:
    score -= 10

# Deduct for source maps in production (-10)
if bundles.get('has_sourcemaps', False):
    score -= 10

# Deduct for heavy deps (-5 each, max -20)
heavy = len(deps.get('heavy_deps', []))
score -= min(heavy * 5, 20)

score = max(0, score)

report = {
    'health_score': score,
    'image_audit': images,
    'bundle_audit': bundles,
    'dep_audit': deps
}

print(json.dumps(report, indent=2))
"
