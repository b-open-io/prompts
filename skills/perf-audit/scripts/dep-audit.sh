#!/usr/bin/env bash
# Check package.json for heavy dependencies and suggest lighter alternatives.
# Outputs JSON to stdout. No network calls — all analysis is local.
set -euo pipefail

DIR="${1:-.}"
DIR=$(cd "$DIR" && pwd)

PKG="$DIR/package.json"

if [ ! -f "$PKG" ]; then
  cat <<EOF
{
  "error": "no_package_json",
  "message": "No package.json found at $DIR",
  "heavy_deps": [],
  "total_deps": 0,
  "total_dev_deps": 0
}
EOF
  exit 0
fi

# Known heavy packages and their lighter alternatives
# Format: package_name|alternative|reason
HEAVY_DEPS=(
  "moment|date-fns or dayjs|moment is 300KB+ and mutable; date-fns is tree-shakable, dayjs is 2KB"
  "lodash|lodash-es or native methods|lodash full bundle is 70KB+; use lodash-es for tree-shaking or native JS"
  "@material-ui/core|@mui/material with tree-shaking|ensure optimizePackageImports is set"
  "@mui/material|verify optimizePackageImports|can be 300KB+ without proper tree-shaking"
  "@mui/icons-material|@mui/icons-material with optimizePackageImports|icon packages are huge without tree-shaking"
  "antd|antd with tree-shaking or headless UI|antd full bundle is 1MB+"
  "rxjs|native async/await or event emitters|rxjs is 40KB+ and rarely needed in full"
  "jquery|native DOM APIs|jquery is 87KB and unnecessary in modern frameworks"
  "underscore|native methods|underscore is superseded by native ES6+"
  "bluebird|native Promise|native Promises are now fast and feature-complete"
  "request|fetch or undici|request is deprecated and 1MB+ with deps"
  "axios|fetch or ky|fetch is built-in; ky is 3KB"
  "chart.js|lightweight-charts or uPlot|chart.js is 200KB+; alternatives are 40KB"
  "three|@react-three/fiber with dynamic imports|three.js is 600KB+; lazy-load if possible"
  "firebase|firebase/app with modular imports|firebase full SDK is 500KB+; use modular tree-shakable imports"
  "@fortawesome/fontawesome-free|lucide-react or heroicons|font-awesome is 1MB+; icon libs are 0-cost with tree-shaking"
  "react-icons|lucide-react or heroicons|react-icons bundles all icon sets; use a single set"
  "core-js|core-js with usage-based polyfill|full core-js is 200KB+; configure babel for usage-based"
  "animate.css|tailwind animations or CSS @keyframes|animate.css is 80KB of CSS you mostly don't use"
  "bootstrap|tailwindcss|bootstrap CSS is 200KB+; tailwind purges unused styles"
  "semantic-ui|tailwindcss or headless UI|semantic-ui is 600KB+"
  "aws-sdk|@aws-sdk/client-*|aws-sdk v2 is 40MB+; v3 is modular"
)

# Extract dependencies
deps=$(cat "$PKG" | python3 -c "
import json, sys
pkg = json.load(sys.stdin)
deps = list(pkg.get('dependencies', {}).keys())
dev_deps = list(pkg.get('devDependencies', {}).keys())
print(json.dumps({'deps': deps, 'dev_deps': dev_deps, 'total_deps': len(deps), 'total_dev_deps': len(dev_deps)}))
" 2>/dev/null || echo '{"deps":[],"dev_deps":[],"total_deps":0,"total_dev_deps":0}')

total_deps=$(echo "$deps" | python3 -c "import json,sys; print(json.load(sys.stdin)['total_deps'])")
total_dev_deps=$(echo "$deps" | python3 -c "import json,sys; print(json.load(sys.stdin)['total_dev_deps'])")
all_deps=$(echo "$deps" | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(d['deps'] + d['dev_deps']))")

# Check each dep against known heavy list
heavy_json=""
while IFS='|' read -r pkg_name alternative reason; do
  if echo "$all_deps" | grep -qx "$pkg_name" 2>/dev/null; then
    escaped_name=$(printf '%s' "$pkg_name" | sed 's/"/\\"/g')
    escaped_alt=$(printf '%s' "$alternative" | sed 's/"/\\"/g')
    escaped_reason=$(printf '%s' "$reason" | sed 's/"/\\"/g')

    entry=$(printf '{"name":"%s","alternative":"%s","reason":"%s"}' \
      "$escaped_name" "$escaped_alt" "$escaped_reason")

    if [ -z "$heavy_json" ]; then
      heavy_json="$entry"
    else
      heavy_json="$heavy_json,$entry"
    fi
  fi
done <<< "$(printf '%s\n' "${HEAVY_DEPS[@]}")"

if [ -z "$heavy_json" ]; then
  heavy_json="[]"
else
  heavy_json="[$heavy_json]"
fi

cat <<EOF
{
  "heavy_deps": $heavy_json,
  "total_deps": $total_deps,
  "total_dev_deps": $total_dev_deps
}
EOF
